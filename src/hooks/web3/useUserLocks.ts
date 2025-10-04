import { useGetAllLockIds, useGetLockInfo } from './useLPLocker';
import type { LockWithId } from '@/types/web3';

/**
 * Get all locks from a specific locker contract
 * @param lockerAddress - Address of the locker contract to query
 */
export function useLockerLocks(lockerAddress?: `0x${string}`) {
  const { data: lockIds, isLoading: isLoadingIds, refetch } = useGetAllLockIds(lockerAddress);

  const locks: LockWithId[] = [];
  let isLoadingLocks = false;

  if (lockIds && lockIds.length > 0 && lockerAddress) {
    for (const lockId of lockIds) {
      const { data: lockData, isLoading } = useGetLockInfo(lockerAddress, lockId);
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
