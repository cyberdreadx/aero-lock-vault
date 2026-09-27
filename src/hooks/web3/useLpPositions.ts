import { useQuery } from '@tanstack/react-query';
import { createPublicClient, decodeFunctionResult, encodeFunctionData, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { AERODROME } from '@/lib/web3/constants';

export interface LpPosition {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  stable: boolean;
}

interface BlockscoutTokenBalance {
  value: string | null;
  token: null | {
    address?: string;
    address_hash?: string;
    symbol: string | null;
    name: string | null;
    decimals: string | null;
    type: string;
  };
}

// read-only Base client (wagmi's bundled viem types don't line up with the app's viem)
const baseClient = createPublicClient({ chain: base, transport: http() });

const BLOCKSCOUT_URL = 'https://base.blockscout.com/api/v2/addresses';
const FACTORY_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);
const MULTICALL3_ABI = parseAbi([
  'struct Call3 { address target; bool allowFailure; bytes callData; }',
  'struct Result { bool success; bytes returnData; }',
  'function aggregate3(Call3[] calls) view returns (Result[] returnData)', // payable on-chain; view for a read-only call,
]);

/** Aerodrome LP tokens held by `wallet`, largest balance first. */
export async function fetchLpPositions(wallet: `0x${string}`): Promise<LpPosition[]> {
  const res = await fetch(`${BLOCKSCOUT_URL}/${wallet}/token-balances`);
  if (!res.ok) throw new Error(`blockscout ${res.status}`);
  const items = (await res.json()) as BlockscoutTokenBalance[];

  const candidates = items
    .flatMap((i) => {
      // entries can lack token details or carry odd values; skip rather than fail
      if (i.token?.type !== 'ERC-20' || !/^\d+$/.test(i.value ?? '')) return [];
      const balance = BigInt(i.value!);
      if (balance === 0n) return [];
      return [{
        address: (i.token.address_hash ?? i.token.address ?? '') as `0x${string}`,
        symbol: i.token.symbol ?? '',
        name: i.token.name ?? '',
        decimals: Number(i.token.decimals ?? 18),
        balance,
      }];
    })
    .filter((t) => t.address);
  if (candidates.length === 0) return [];

  // one aggregate3 call asks the factory about every candidate
  const calls = candidates.map((t) => ({
    target: AERODROME.FACTORY as `0x${string}`,
    allowFailure: true,
    callData: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'isPool', args: [t.address] }),
  }));
  const raw = (await baseClient.request({
    method: 'eth_call',
    params: [
      {
        to: base.contracts.multicall3.address,
        data: encodeFunctionData({ abi: MULTICALL3_ABI, functionName: 'aggregate3', args: [calls] }),
      },
      'latest',
    ],
  })) as `0x${string}`; // eth_call always returns hex
  const results = decodeFunctionResult({ abi: MULTICALL3_ABI, functionName: 'aggregate3', data: raw });
  const isPool = results.map(
    (r) => r.success && r.returnData !== '0x' && decodeFunctionResult({ abi: FACTORY_ABI, functionName: 'isPool', data: r.returnData }),
  );

  return candidates
    .filter((_, i) => isPool[i] === true)
    .map((t) => ({ ...t, stable: t.symbol.startsWith('sAMM') }))
    .sort((a, b) => (a.balance > b.balance ? -1 : 1));
}

/**
 * Aerodrome LP tokens held by a wallet. Blockscout lists the wallet's ERC-20
 * balances (there are too many pools to scan on-chain); each candidate is then
 * confirmed with the Aerodrome factory so look-alike tokens are ignored.
 * LP staked in a gauge isn't in the wallet, so it won't show up here.
 */
export function useLpPositions(wallet?: `0x${string}`) {
  const query = useQuery({
    queryKey: ['aerodrome-lp-positions', wallet],
    enabled: !!wallet,
    staleTime: 30_000,
    queryFn: () => fetchLpPositions(wallet!),
  });

  return {
    positions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      query.refetch();
    },
  };
}
