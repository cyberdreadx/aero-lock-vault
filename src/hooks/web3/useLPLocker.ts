import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/constants';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import type { LockInfo } from '@/types/web3';

export function useLPLocker() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const lockLiquidity = async (lpToken: `0x${string}`, amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'lockLiquidity',
      args: [lpToken, amount],
    } as any);
  };

  const triggerWithdrawal = async (lockId: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'triggerWithdrawal',
      args: [lockId],
    } as any);
  };

  const cancelWithdrawalTrigger = async (lockId: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'cancelWithdrawalTrigger',
      args: [lockId],
    } as any);
  };

  const withdrawLP = async (lockId: bigint, amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'withdrawLP',
      args: [lockId, amount],
    } as any);
  };

  const claimLPFees = async (lockId: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'claimLPFees',
      args: [lockId],
    } as any);
  };

  const topUpLock = async (lockId: bigint, amount: bigint) => {
    return await writeContractAsync({
      address: CONTRACTS.LP_LOCKER,
      abi: LPLockerABI,
      functionName: 'topUpLock',
      args: [lockId, amount],
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

export function useGetLockInfo(lockId?: bigint) {
  return useReadContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LPLockerABI,
    functionName: 'getLockInfo',
    args: lockId !== undefined ? [lockId] : undefined,
    query: {
      enabled: lockId !== undefined,
    },
  }) as { data: LockInfo | undefined; isLoading: boolean; error: Error | null };
}

export function useGetAllLockIds() {
  const { address } = useAccount();
  
  return useReadContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LPLockerABI,
    functionName: 'getAllLockIds',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint[] | undefined; isLoading: boolean; error: Error | null };
}

export function useWaitForTransaction(hash?: `0x${string}`) {
  return useWaitForTransactionReceipt({
    hash,
  });
}
