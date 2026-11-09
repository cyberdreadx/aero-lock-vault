import { useQuery } from '@tanstack/react-query';
import { multicallRead } from '@/lib/web3/baseReads';
import { decodeIsPool, isPoolCalls } from '@/lib/web3/aeroPools';

/** 'lp' for Aerodrome pool tokens, 'token' for any other ERC-20. */
export type LockKind = 'lp' | 'token';


export async function fetchTokenKind(token: `0x${string}`): Promise<LockKind> {
  const isPool = decodeIsPool(await multicallRead(isPoolCalls(token)));
  if (isPool === null) throw new Error('could not check token kind');
  return isPool ? 'lp' : 'token';
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
