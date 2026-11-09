// Which tokens are Aerodrome / Aero LP. Since Aero launched (Oct 22 2026) Base has three pool
// factories: the legacy Aerodrome one (still live, no emissions) and Aero's volatile and
// stable ones. LP from any of them can be locked, and fees claimed.
import { decodeFunctionResult, encodeFunctionData, parseAbi } from 'viem';

export const POOL_FACTORIES = [
  '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', // Aerodrome (legacy)
  '0x8E6a9FCd1d638CC760Ffba397605Fe3355dE76D2', // Aero volatile
  '0x78589E876edcEbdce72ee3436ab3c9AD3a7cEF2D', // Aero stable
] as const;

const FACTORY_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);

/** Multicall entries asking every factory whether `token` is one of its pools. */
export function isPoolCalls(token: `0x${string}`) {
  return POOL_FACTORIES.map((factory) => ({
    target: factory as `0x${string}`,
    callData: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'isPool', args: [token] }),
  }));
}

/** Results of isPoolCalls: true if any factory knows the pool, null if none could be asked. */
export function decodeIsPool(results: readonly (`0x${string}` | null)[]): boolean | null {
  if (results.every((r) => r === null)) return null;
  return results.some((r) => r !== null && decodeFunctionResult({ abi: FACTORY_ABI, functionName: 'isPool', data: r }));
}

/** "vAMM-X/WETH", "sAMMV2-X/Y" etc. */
export const LP_SYMBOL_PREFIX = /^[sv]AMM(V2)?-/;

/** Stable pool LP ("sAMM-…" / "sAMMV2-…"). */
export const isStableSymbol = (symbol: string) => /^sAMM(V2)?-/.test(symbol);
