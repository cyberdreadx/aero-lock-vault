import { useGetAllLockIds, useGetLockInfo } from './useLPLocker';
import type { LockWithId } from '@/types/web3';

export function useUserLocks() {
  const { data: lockIds, isLoading: isLoadingIds } = useGetAllLockIds();

  const locks: LockWithId[] = [];
  let isLoadingLocks = false;

  if (lockIds && lockIds.length > 0) {
    for (const lockId of lockIds) {
      const { data: lockInfo, isLoading } = useGetLockInfo(lockId);
      if (isLoading) isLoadingLocks = true;
      if (lockInfo) {
        locks.push({ ...lockInfo, lockId });
      }
    }
  }

  return {
    locks,
    isLoading: isLoadingIds || isLoadingLocks,
  };
}
