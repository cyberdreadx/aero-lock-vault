import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import { multicallRead } from '@/lib/web3/baseReads';

export interface GlobalStats {
  totalLockers: number;
  /** locks still holding tokens (fully withdrawn locks are removed on-chain) */
  totalLocks: number;
  /** distinct LP / tokens with at least one active lock */
  lockedAssets: number;
  lockers: Array<{
    locker_address: string;
    lp_token_address: string;
    deployed_at: string;
  }>;
}

async function fetchGlobalStats(): Promise<GlobalStats> {
  const { data: lockers, error } = await supabase
    .from('deployed_lockers')
    .select('locker_address, lp_token_address, deployed_at')
    .order('deployed_at', { ascending: false });
  if (error) throw error;
  const list = lockers ?? [];

  // One batched call for every locker's lock ids. Firing a request per locker got
  // rate-limited by the public RPC, and each failure silently counted as 0.
  const results = await multicallRead(
    list.map((l) => ({
      target: l.locker_address as `0x${string}`,
      callData: encodeFunctionData({ abi: LPLockerABI, functionName: 'getAllLockIds' }),
    })),
  );

  let totalLocks = 0;
  const assets = new Set<string>();
  list.forEach((l, i) => {
    const data = results[i];
    // a locker that can't answer is an error to retry, not "0 locks"
    if (!data) throw new Error(`could not read locks for ${l.locker_address}`);
    const ids = decodeFunctionResult({ abi: LPLockerABI, functionName: 'getAllLockIds', data }) as readonly string[];
    totalLocks += ids.length;
    if (ids.length > 0) assets.add(l.lp_token_address.toLowerCase());
  });

  return { totalLockers: list.length, totalLocks, lockedAssets: assets.size, lockers: list };
}

/**
 * Site-wide numbers for the home page. Everything is read in one query, so the
 * numbers only change together; on a failed refresh react-query retries and keeps
 * showing the last good values instead of a wrong count.
 */
export function useGlobalStats() {
  return useQuery({
    queryKey: ['global-stats'],
    queryFn: fetchGlobalStats,
    refetchInterval: 60_000,
    retry: 3,
  });
}
