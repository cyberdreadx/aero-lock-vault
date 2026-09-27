import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, parseAbi } from 'viem';
import { multicallRead } from '@/lib/web3/baseReads';
import { AERODROME } from '@/lib/web3/constants';

export interface WalletToken {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  priced: boolean;
  holders: number;
}

interface BlockscoutTokenBalance {
  token: null | {
    address_hash?: string;
    address?: string;
    symbol: string | null;
    name: string | null;
    decimals: string | null;
    type: string;
    exchange_rate?: string | null;
    holders_count?: string | null;
  };
}

const BLOCKSCOUT_URL = 'https://base.blockscout.com/api/v2/addresses';
const FACTORY_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);
const ERC20_BALANCE_ABI = parseAbi(['function balanceOf(address account) view returns (uint256)']);

// airdropped scam tokens advertise links or "claim" in their name/symbol
const FAKE_BALANCE = 2n ** 200n;
const SPAM = /(https?:|www\.|\.com|\.io|\.xyz|\.org|\.net|\.app|t\.me|telegram|@|\bbot\b|claim|visit|reward|airdrop|voucher|bonus|gift|\$\s*\d)/i;

/**
 * Plain ERC-20 tokens (not Aerodrome LP) the wallet holds, for the token-lock picker.
 * Blockscout supplies candidates; balances and the LP check are read on-chain.
 * Tokens with a market price and more holders come first; new unpriced tokens still show.
 */
export async function fetchWalletTokens(wallet: `0x${string}`): Promise<WalletToken[]> {
  const res = await fetch(`${BLOCKSCOUT_URL}/${wallet}/token-balances`);
  if (!res.ok) throw new Error(`blockscout ${res.status}`);
  const items = (await res.json()) as BlockscoutTokenBalance[];

  const candidates = items.flatMap((i) => {
    const t = i.token;
    if (t?.type !== 'ERC-20') return [];
    const address = (t.address_hash ?? t.address ?? '') as `0x${string}`;
    if (!address || SPAM.test(`${t.name ?? ''} ${t.symbol ?? ''}`)) return [];
    return [{
      address,
      symbol: t.symbol ?? '',
      name: t.name ?? '',
      decimals: Number(t.decimals ?? 18),
      priced: !!t.exchange_rate,
      holders: Number(t.holders_count ?? 0),
    }];
  });
  if (candidates.length === 0) return [];

  const results = await multicallRead(
    candidates.flatMap((t) => [
      {
        target: AERODROME.FACTORY as `0x${string}`,
        callData: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'isPool', args: [t.address] }),
      },
      {
        target: t.address,
        callData: encodeFunctionData({ abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [wallet] }),
      },
    ]),
  );

  return candidates
    .flatMap((t, i) => {
      const poolData = results[i * 2];
      const balanceData = results[i * 2 + 1];
      if (!poolData || !balanceData) return [];
      // LP belongs in the LP lock flow
      if (decodeFunctionResult({ abi: FACTORY_ABI, functionName: 'isPool', data: poolData })) return [];
      const balance = decodeFunctionResult({ abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', data: balanceData });
      // spam tokens often fake an impossible balance (near 2^256) and have no symbol
      if (balance === 0n || balance >= FAKE_BALANCE || !(t.symbol || t.name).trim()) return [];
      return [{ ...t, balance }];
    })
    .sort((a, b) => Number(b.priced) - Number(a.priced) || b.holders - a.holders);
}

export function useWalletTokens(wallet?: `0x${string}`, enabled = true) {
  const query = useQuery({
    queryKey: ['wallet-tokens', wallet],
    enabled: !!wallet && enabled,
    staleTime: 30_000,
    queryFn: () => fetchWalletTokens(wallet!),
  });
  return {
    tokens: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      query.refetch();
    },
  };
}
