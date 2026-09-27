// Submits a locker's source to Basescan (Etherscan v2 API) so it shows as verified.
// Needs the BASESCAN_API_KEY secret (an Etherscan API key works: v2 covers Base).
import { LOCKER_SOURCE } from './lockerSource.ts';

const API_URL = 'https://api.etherscan.io/v2/api?chainid=8453';

// Settings the lockers were compiled with. Confirmed by recompiling the source:
// creation and runtime code match deployed lockers.
const COMPILER_VERSION = 'v0.8.20+commit.a1b79de6';
const EVM_VERSION = 'shanghai';
const MIT_LICENSE = '3';

// constructor(address tokenContract_, address owner_, address feeReceiver_) = 3 x 32 bytes
const CONSTRUCTOR_ARGS_HEX_LENGTH = 3 * 64;

export type VerifyResult =
  | { status: 'submitted'; guid: string }
  | { status: 'already_verified' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** constructor args are the tail of the deployment tx input (creation code + abi-encoded args) */
export function constructorArgsFromDeployInput(input: string): string {
  const hex = input.startsWith('0x') ? input.slice(2) : input;
  return hex.slice(-CONSTRUCTOR_ARGS_HEX_LENGTH);
}

export async function submitLockerVerification(
  lockerAddress: string,
  constructorArgs: string,
): Promise<VerifyResult> {
  const apiKey = Deno.env.get('BASESCAN_API_KEY');
  if (!apiKey) return { status: 'skipped', reason: 'BASESCAN_API_KEY is not set' };

  const body = new URLSearchParams({
    module: 'contract',
    action: 'verifysourcecode',
    apikey: apiKey,
    contractaddress: lockerAddress,
    sourceCode: LOCKER_SOURCE,
    codeformat: 'solidity-single-file',
    contractname: 'LPLocker',
    compilerversion: COMPILER_VERSION,
    optimizationUsed: '0',
    runs: '200',
    evmversion: EVM_VERSION,
    licenseType: MIT_LICENSE,
    // (sic) Etherscan's parameter name
    constructorArguements: constructorArgs,
  });

  // A freshly deployed contract can take a little while to be indexed.
  const attempts = 5;
  let lastReason = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(API_URL, { method: 'POST', body });
      const data = await res.json();
      const message = String(data?.result ?? data?.message ?? '');

      if (data?.status === '1') {
        console.log('Basescan verification submitted', lockerAddress, message);
        return { status: 'submitted', guid: message };
      }
      if (/already verified/i.test(message)) {
        return { status: 'already_verified' };
      }

      lastReason = message || `HTTP ${res.status}`;
      if (!/unable to locate contractcode|not found|try again|rate limit/i.test(lastReason)) break;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await sleep(10_000);
  }

  console.error('Basescan verification failed', lockerAddress, lastReason);
  return { status: 'failed', reason: lastReason };
}

/** keep work running after the response is sent, where the runtime supports it */
export function runInBackground(promise: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise);
  else promise.catch((error) => console.error('background task failed', error));
}
