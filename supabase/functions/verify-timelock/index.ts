// Verifies the timed-lock contracts on Basescan: the factory, the vault logic every lock
// clones, and optionally one lock (a clone), which Basescan then links to the verified
// vault logic. Safe to call repeatedly - already-verified contracts are skipped.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isAddress, parseAbi } from 'https://esm.sh/viem@2.37.12';
import {
  checkVerificationStatus,
  submitProxyVerification,
  submitStandardJsonVerification,
  type VerifyResult,
} from '../_shared/basescan.ts';
import { createBaseClient } from '../_shared/rpc.ts';
import {
  TIMELOCK_COMPILER_VERSION,
  TIMELOCK_FACTORY_ADDRESS,
  TIMELOCK_FACTORY_CONSTRUCTOR_ARGS,
  TIMELOCK_STANDARD_INPUT,
} from '../_shared/timelockSources.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const FACTORY_ABI = parseAbi(['function implementation() view returns (address)']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// EIP-1167 minimal proxy runtime pointing at `impl`
const cloneCode = (impl: string) => `0x363d3d373d3d3d363d73${impl.slice(2).toLowerCase()}5af43d82803e903d91602b57fd5bf3`;

/** Waits briefly for a submitted job's verdict so the caller learns whether it passed. */
async function settle(result: VerifyResult, proxy = false): Promise<VerifyResult | { status: 'verified' | 'rejected'; detail: string }> {
  if (result.status !== 'submitted') return result;
  for (let i = 0; i < 6; i++) {
    await sleep(5_000);
    const verdict = await checkVerificationStatus(result.guid, proxy).catch(() => '');
    if (/pass|verified|success/i.test(verdict)) return { status: 'verified', detail: verdict };
    if (/fail|unable|error/i.test(verdict) && !/pending/i.test(verdict)) return { status: 'rejected', detail: verdict };
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { vaultAddress } = await req.json().catch(() => ({}));
    if (vaultAddress !== undefined && !isAddress(vaultAddress, { strict: false })) {
      return json({ error: 'vaultAddress must be an address' }, 400);
    }

    const client = createBaseClient();
    const implementation = await client.readContract({
      address: TIMELOCK_FACTORY_ADDRESS as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'implementation',
    });

    const common = { standardInput: TIMELOCK_STANDARD_INPUT, compilerVersion: TIMELOCK_COMPILER_VERSION };
    const [factory, vaultLogic] = await Promise.all([
      submitStandardJsonVerification({
        ...common,
        address: TIMELOCK_FACTORY_ADDRESS,
        contractName: 'src/AeroLockFactory.sol:AeroLockFactory',
        constructorArgs: TIMELOCK_FACTORY_CONSTRUCTOR_ARGS,
      }).then((r) => settle(r)),
      submitStandardJsonVerification({
        ...common,
        address: implementation,
        contractName: 'src/AeroVestingVault.sol:AeroVestingVault',
      }).then((r) => settle(r)),
    ]);

    let lock: unknown = undefined;
    if (vaultAddress) {
      // only link genuine AeroLock clones
      const code = await client.getCode({ address: vaultAddress as `0x${string}` });
      lock =
        code?.toLowerCase() === cloneCode(implementation)
          ? await settle(await submitProxyVerification(vaultAddress, implementation), true)
          : { status: 'skipped', reason: 'not an AeroLock timed-lock vault' };
    }

    console.log('verify-timelock', { factory, vaultLogic, lock });
    return json({ factory, vaultLogic, implementation, lock });
  } catch (error) {
    console.error('Error in verify-timelock function:', error);
    return json({ error: "Couldn't reach Base or Basescan right now - please try again in a minute" }, 503);
  }
});
