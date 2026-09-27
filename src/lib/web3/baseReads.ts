import { createPublicClient, decodeFunctionResult, encodeFunctionData, fallback, http, parseAbi } from 'viem';
import { BASE_RPC_URLS } from './rpc';
import { base } from 'viem/chains';

// Read-only Base client for batched reads. wagmi's bundled viem types don't line up
// with the app's viem, so these reads go through viem directly.
export const baseClient = createPublicClient({
  chain: base,
  transport: fallback(BASE_RPC_URLS.map((url) => http(url, { timeout: 10_000 }))),
});

const MULTICALL3_ABI = parseAbi([
  'struct Call3 { address target; bool allowFailure; bytes callData; }',
  'struct Result { bool success; bytes returnData; }',
  'function aggregate3(Call3[] calls) view returns (Result[] returnData)', // payable on-chain; view for a read-only call
]);

/** Runs many contract reads in one eth_call; failed calls come back as null. */
export async function multicallRead(
  calls: { target: `0x${string}`; callData: `0x${string}` }[],
): Promise<(`0x${string}` | null)[]> {
  if (calls.length === 0) return [];
  const raw = (await baseClient.request({
    method: 'eth_call',
    params: [
      {
        to: base.contracts.multicall3.address,
        data: encodeFunctionData({
          abi: MULTICALL3_ABI,
          functionName: 'aggregate3',
          args: [calls.map((c) => ({ ...c, allowFailure: true }))],
        }),
      },
      'latest',
    ],
  })) as `0x${string}`; // eth_call always returns hex
  const results = decodeFunctionResult({ abi: MULTICALL3_ABI, functionName: 'aggregate3', data: raw });
  return results.map((r) => (r.success && r.returnData !== '0x' ? r.returnData : null));
}
