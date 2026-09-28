// Submits contract sources to Basescan (Etherscan v2 API) so they show as verified.
// Needs the BASESCAN_API_KEY secret (an Etherscan API key works: v2 covers Base).
import { LOCKER_SOURCE } from './lockerSource.ts';

const API_URL = 'https://api.etherscan.io/v2/api?chainid=8453';

// Settings the lockers were compiled with. Confirmed by recompiling the source:
// creation and runtime code match deployed lockers.
const COMPILER_VERSION = 'v0.8.20+commit.a1b79de6';
const EVM_VERSION = 'shanghai';
const MIT_LICENSE = '3';

export type VerifyResult =
  | { status: 'submitted'; guid: string }
  | { status: 'already_verified' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function submitLockerVerification(lockerAddress: string, constructorArgs: string): Promise<VerifyResult> {
  return submitVerification(lockerAddress, {
    action: 'verifysourcecode',
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
}

/** Verifies a contract from a solc standard-JSON input (multi-file sources). */
export function submitStandardJsonVerification(opts: {
  address: string;
  /** "path/File.sol:ContractName" */
  contractName: string;
  standardInput: string;
  compilerVersion: string;
  constructorArgs?: string;
}): Promise<VerifyResult> {
  return submitVerification(opts.address, {
    action: 'verifysourcecode',
    contractaddress: opts.address,
    sourceCode: opts.standardInput,
    codeformat: 'solidity-standard-json-input',
    contractname: opts.contractName,
    compilerversion: opts.compilerVersion,
    licenseType: MIT_LICENSE,
    constructorArguements: opts.constructorArgs ?? '',
  });
}

/** Links a proxy (e.g. an EIP-1167 clone) to its verified implementation on Basescan. */
export function submitProxyVerification(address: string, implementation: string): Promise<VerifyResult> {
  return submitVerification(address, { action: 'verifyproxycontract', address, expectedimplementation: implementation });
}

async function submitVerification(address: string, params: Record<string, string>): Promise<VerifyResult> {
  const apiKey = Deno.env.get('BASESCAN_API_KEY');
  if (!apiKey) return { status: 'skipped', reason: 'BASESCAN_API_KEY is not set' };
  const body = new URLSearchParams({ module: 'contract', apikey: apiKey, ...params });

  // A freshly deployed contract can take a little while to be indexed.
  const attempts = 5;
  let lastReason = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(API_URL, { method: 'POST', body });
      const data = await res.json();
      const message = String(data?.result ?? data?.message ?? '');

      if (data?.status === '1') {
        console.log('Basescan verification submitted', address, message);
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

  console.error('Basescan verification failed', address, lastReason);
  return { status: 'failed', reason: lastReason };
}

/** Result of a submitted job ("Pass - Verified", "Fail - ...", "Pending in queue"). */
export async function checkVerificationStatus(guid: string, proxy = false): Promise<string> {
  const apiKey = Deno.env.get('BASESCAN_API_KEY') ?? '';
  const query = new URLSearchParams({
    module: 'contract',
    action: proxy ? 'checkproxyverification' : 'checkverifystatus',
    guid,
    apikey: apiKey,
  });
  const res = await fetch(`${API_URL}&${query}`);
  const data = await res.json();
  return String(data?.result ?? data?.message ?? '');
}

/** keep work running after the response is sent, where the runtime supports it */
export function runInBackground(promise: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise);
  else promise.catch((error) => console.error('background task failed', error));
}
