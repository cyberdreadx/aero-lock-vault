// Wallet-agnostic checks that an address is a genuine AeroLock locker.
// Smart wallets (e.g. the Base app) deploy through a CREATE2 deployer or a bundler,
// so "who sent the deploy tx" and "tx.contractAddress" aren't reliable; the locker's
// own creation event and runtime code are.
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbi,
} from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';

// keccak256 of an LPLocker's runtime code with its immutable tokenContract zeroed.
// Identical for every locker deployed so far (checked across all 4 on Base).
const LOCKER_CODE_FINGERPRINT = '0xd7801788172eb22617bf0284ebd7d87610b4fc84872abae9179a02e8f1fbea98';

// OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
const OWNERSHIP_TRANSFERRED = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0';
const ZERO_TOPIC = `0x${'0'.repeat(64)}`;

const client = createPublicClient({ chain: base, transport: http() });

/** The parts of a transaction receipt this check needs. */
interface DeployReceipt {
  status: string;
  logs: ReadonlyArray<{ address: string; topics: ReadonlyArray<string | null> }>;
}

const LOCKER_ABI = parseAbi([
  'function tokenContract() view returns (address)',
  'function feeReceiver() view returns (address)',
]);

export type LockerInspection =
  | { ok: true; owner: string; tokenContract: string; feeReceiver: string }
  | { ok: false; reason: string };

/** Confirms `deployReceipt` created `locker`, that it runs the AeroLock locker code, and returns its setup. */
export async function inspectLocker(locker: string, deployReceipt: DeployReceipt): Promise<LockerInspection> {
  const address = locker.toLowerCase() as `0x${string}`;
  if (deployReceipt.status !== 'success') return { ok: false, reason: 'Deployment transaction failed' };

  // Ownable's constructor emits OwnershipTransferred(0x0, owner) from the new locker
  const creation = deployReceipt.logs.find(
    (log) =>
      log.address.toLowerCase() === address &&
      log.topics[0]?.toLowerCase() === OWNERSHIP_TRANSFERRED &&
      log.topics[1]?.toLowerCase() === ZERO_TOPIC,
  );
  if (!creation?.topics[2]) return { ok: false, reason: 'Deployment transaction did not create this locker' };
  const owner = `0x${creation.topics[2].slice(26)}`.toLowerCase();

  const code = await client.getCode({ address });
  if (!code || code === '0x') return { ok: false, reason: 'No contract at this locker address' };

  let tokenContract: `0x${string}`;
  let feeReceiver: `0x${string}`;
  try {
    [tokenContract, feeReceiver] = await Promise.all([
      client.readContract({ address, abi: LOCKER_ABI, functionName: 'tokenContract' }),
      client.readContract({ address, abi: LOCKER_ABI, functionName: 'feeReceiver' }),
    ]);
  } catch (error) {
    // A revert means the contract has no such functions; anything else (rate limit,
    // network) is transient and must not be reported as "not a locker".
    const reverted =
      error instanceof BaseError &&
      !!error.walk((e) => e instanceof ContractFunctionRevertedError || (e as { name?: string }).name === 'ContractFunctionZeroDataError');
    if (reverted) return { ok: false, reason: 'This contract is not an AeroLock locker' };
    throw error;
  }

  const tokenWord = tokenContract.toLowerCase().slice(2).padStart(64, '0');
  const masked = code.toLowerCase().split(tokenWord).join('0'.repeat(64)) as `0x${string}`;
  if (keccak256(masked) !== LOCKER_CODE_FINGERPRINT) {
    return { ok: false, reason: 'This contract is not an AeroLock locker' };
  }

  return { ok: true, owner, tokenContract: tokenContract.toLowerCase(), feeReceiver: feeReceiver.toLowerCase() };
}

/** ABI-encoded constructor(tokenContract_, owner_, feeReceiver_) args, as Basescan expects them. */
export function lockerConstructorArgs(tokenContract: string, owner: string, feeReceiver: string): string {
  return encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'address' }],
    [tokenContract as `0x${string}`, owner as `0x${string}`, feeReceiver as `0x${string}`],
  ).slice(2);
}
