import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/constants';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import type { LockInfo } from '@/types/web3';

export function useLPLocker() {
  const { writeContractAsync } = useWriteContract();

  const lockLiquidity = async (amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'lockLiquidity',
      args: [amount],
    } as any);
  };

  const triggerWithdrawal = async (lockId: string) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'triggerWithdrawal',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const cancelWithdrawalTrigger = async (lockId: string) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'cancelWithdrawalTrigger',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const withdrawLP = async (lockId: string, amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'withdrawLP',
      args: [lockId as `0x${string}`, amount],
    } as any);
  };

  const claimLPFees = async (lockId: string) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'claimLPFees',
      args: [lockId as `0x${string}`],
    } as any);
  };

  const topUpLock = async (lockId: string, amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
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

export function useGetLockInfo(lockId?: string) {
  return useReadContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LPLockerABI,
    functionName: 'getLockInfo',
    args: lockId ? [lockId as `0x${string}`] : undefined,
    query: {
      enabled: !!lockId,
    },
  }) as { data: [string, string, string, bigint, bigint, boolean, boolean] | undefined; isLoading: boolean; error: Error | null; refetch: () => void };
}

export function useGetAllLockIds() {
  return useReadContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LPLockerABI,
    functionName: 'getAllLockIds',
    query: {
      enabled: true,
    },
  }) as { data: string[] | undefined; isLoading: boolean; error: Error | null; refetch: () => void };
}

export function useWaitForTransaction(hash?: `0x${string}`) {
  return useWaitForTransactionReceipt({
    hash,
  });
}
