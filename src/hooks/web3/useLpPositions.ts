import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, parseAbi } from 'viem';
import { multicallRead } from '@/lib/web3/baseReads';
import { decodeIsPool, isPoolCalls, isStableSymbol } from '@/lib/web3/aeroPools';

export interface LpPosition {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  stable: boolean;
}

interface BlockscoutTokenBalance {
  token: null | {
    address?: string;
    address_hash?: string;
    symbol: string | null;
    name: string | null;
    decimals: string | null;
    type: string;
  };
}

const BLOCKSCOUT_URL = 'https://base.blockscout.com/api/v2/addresses';
// isPool on each pool factory, then balanceOf
const PER_TOKEN = 4;
const ERC20_BALANCE_ABI = parseAbi(['function balanceOf(address account) view returns (uint256)']);

/** Aerodrome LP tokens held by `wallet`, largest balance first. */
export async function fetchLpPositions(wallet: `0x${string}`): Promise<LpPosition[]> {
  const res = await fetch(`${BLOCKSCOUT_URL}/${wallet}/token-balances`);
  if (!res.ok) throw new Error(`blockscout ${res.status}`);
  const items = (await res.json()) as BlockscoutTokenBalance[];

  // Blockscout only supplies candidate tokens; balances are read on-chain below
  const candidates = items
    .flatMap((i) => {
      // entries can lack token details; skip rather than fail
      if (i.token?.type !== 'ERC-20') return [];
      const address = (i.token.address_hash ?? i.token.address ?? '') as `0x${string}`;
      if (!address) return [];
      return [{
        address,
        symbol: i.token.symbol ?? '',
        name: i.token.name ?? '',
        decimals: Number(i.token.decimals ?? 18),
      }];
    });
  if (candidates.length === 0) return [];

  // One batched call: is it an Aerodrome/Aero pool (each factory), and the live balance
  // (Blockscout's balances can lag, e.g. right after LP moves into a locker).
  const results = await multicallRead(
    candidates.flatMap((t) => [
      ...isPoolCalls(t.address),
      {
        target: t.address,
        callData: encodeFunctionData({ abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [wallet] }),
      },
    ]),
  );

  return candidates
    .flatMap((t, i) => {
      const row = results.slice(i * PER_TOKEN, (i + 1) * PER_TOKEN);
      const balanceData = row[PER_TOKEN - 1];
      if (!balanceData || !decodeIsPool(row.slice(0, PER_TOKEN - 1))) return [];
      const balance = decodeFunctionResult({ abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', data: balanceData });
      return balance > 0n ? [{ ...t, balance, stable: isStableSymbol(t.symbol) }] : [];
    })
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
