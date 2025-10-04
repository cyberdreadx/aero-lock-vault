import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import type { LockInfo } from '@/types/web3';

/**
 * Hook to interact with a specific LPLocker contract
 * @param lockerAddress - The address of the specific locker contract to interact with
 */
export function useLPLocker(lockerAddress?: `0x${string}`) {
  const { writeContractAsync } = useWriteContract();

  const lockLiquidity = async (amount: bigint) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'lockLiquidity',
      args: [amount],
    } as any);
  };

  const triggerWithdrawal = async (lockId: string) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'triggerWithdrawal',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const cancelWithdrawalTrigger = async (lockId: string) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'cancelWithdrawalTrigger',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const withdrawLP = async (lockId: string, amount: bigint) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'withdrawLP',
      args: [lockId as `0x${string}`, amount],
    } as any);
  };

  const claimLPFees = async (lockId: string) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'claimLPFees',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const topUpLock = async (lockId: string, amount: bigint) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'topUpLock',
      args: [lockId as `0x${string}`, amount],
    } as any);
  };

  return {
    lockLiquidity,
    triggerWithdrawal,
    cancelWithdrawalTrigger,
    withdrawLP,
    claimLPFees,
    topUpLock,
  };
}

/**
 * Get information about a specific lock
 * @param lockerAddress - Address of the locker contract
 * @param lockId - ID of the lock to query
 */
export function useGetLockInfo(lockerAddress?: `0x${string}`, lockId?: string) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'getLockInfo',
    args: lockId ? [lockId as `0x${string}`] : undefined,
    query: {
      enabled: !!lockerAddress && !!lockId,
    },
  }) as { data: [string, string, string, bigint, bigint, boolean, boolean] | undefined; isLoading: boolean; error: Error | null; refetch: () => void };
}

/**
 * Get all lock IDs from a specific locker contract
 * @param lockerAddress - Address of the locker contract
 */
export function useGetAllLockIds(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'getAllLockIds',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: string[] | undefined; isLoading: boolean; error: Error | null; refetch: () => void };
}

export function useWaitForTransaction(hash?: `0x${string}`) {
  return useWaitForTransactionReceipt({
    hash,
  });
}
