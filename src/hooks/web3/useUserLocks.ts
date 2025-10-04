import { useGetAllLockIds } from './useLPLocker';
import type { LockWithId } from '@/types/web3';

/**
 * Get all locks from a specific locker contract
 * Returns only lock IDs - individual lock data should be fetched as needed
 * @param lockerAddress - Address of the locker contract to query
 */
export function useLockerLocks(lockerAddress?: `0x${string}`) {
  const { data: lockIds, isLoading, refetch } = useGetAllLockIds(lockerAddress);

  return {
    lockIds: lockIds || [],
    isLoading,
    refetch,
  };
}
