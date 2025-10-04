import { useGetAllLockIds, useGetLockInfo } from './useLPLocker';
import type { LockWithId } from '@/types/web3';

export function useUserLocks() {
  const { data: lockIds, isLoading: isLoadingIds, refetch } = useGetAllLockIds();

  const locks: LockWithId[] = [];
  let isLoadingLocks = false;

  if (lockIds && lockIds.length > 0) {
    for (const lockId of lockIds) {
      const { data: lockData, isLoading } = useGetLockInfo(lockId);
      if (isLoading) isLoadingLocks = true;
      if (lockData) {
        const [owner, feeReceiver, tokenContract, amount, lockUpEndTime, isLiquidityLocked, isWithdrawalTriggered] = lockData;
        locks.push({
          lockId,
          owner: owner as `0x${string}`,
          feeReceiver: feeReceiver as `0x${string}`,
          tokenContract: tokenContract as `0x${string}`,
          amount,
          lockUpEndTime,
          isLiquidityLocked,
          isWithdrawalTriggered,
        });
      }
    }
  }

  return {
    locks,
    isLoading: isLoadingIds || isLoadingLocks,
    refetch,
  };
}
