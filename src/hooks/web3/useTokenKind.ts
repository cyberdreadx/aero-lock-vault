import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, parseAbi } from 'viem';
import { multicallRead } from '@/lib/web3/baseReads';
import { AERODROME } from '@/lib/web3/constants';

/** 'lp' for Aerodrome pool tokens, 'token' for any other ERC-20. */
export type LockKind = 'lp' | 'token';

const FACTORY_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);

export async function fetchTokenKind(token: `0x${string}`): Promise<LockKind> {
  const [data] = await multicallRead([
    {
      target: AERODROME.FACTORY as `0x${string}`,
      callData: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'isPool', args: [token] }),
    },
  ]);
  if (!data) throw new Error('could not check token kind');
  return decodeFunctionResult({ abi: FACTORY_ABI, functionName: 'isPool', data }) ? 'lp' : 'token';
}

/** Whether a locked token is Aerodrome LP (fees claimable) or a plain token. */
export function useTokenKind(token?: string) {
  return useQuery({
    queryKey: ['token-kind', token?.toLowerCase()],
    enabled: !!token,
    staleTime: Infinity,
    queryFn: () => fetchTokenKind(token as `0x${string}`),
  });
}
