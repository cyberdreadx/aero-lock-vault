import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
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

  const acceptOwnership = async () => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'acceptOwnership',
    } as any);
  };

  const transferOwnership = async (newOwner: `0x${string}`) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'transferOwnership',
      args: [newOwner],
    } as any);
  };

  const changeFeeReceiver = async (newFeeReceiver: `0x${string}`) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'changeFeeReceiver',
      args: [newFeeReceiver],
    } as any);
  };

  const recoverToken = async (token: `0x${string}`, amount: bigint) => {
    if (!lockerAddress) throw new Error('Locker address required');
    return await writeContractAsync({
      address: lockerAddress,
      abi: LPLockerABI,
      functionName: 'recoverToken',
      args: [token, amount],
    } as any);
  };

  return {
    lockLiquidity,
    triggerWithdrawal,
    cancelWithdrawalTrigger,
    withdrawLP,
    claimLPFees,
    topUpLock,
    acceptOwnership,
    transferOwnership,
    changeFeeReceiver,
    recoverToken,
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

/**
 * Get the owner of the locker contract
 */
export function useLockerOwner(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'owner',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: `0x${string}` | undefined; isLoading: boolean; refetch: () => void };
}

/**
 * Get the pending owner of the locker contract
 */
export function useLockerPendingOwner(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'pendingOwner',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: `0x${string}` | undefined; isLoading: boolean; refetch: () => void };
}

/**
 * Get the LP token address of the locker
 */
export function useLockerLPToken(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'tokenContract',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: `0x${string}` | undefined; isLoading: boolean; refetch: () => void };
}

/**
 * Get the fee receiver address of the locker
 */
export function useLockerFeeReceiver(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'feeReceiver',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: `0x${string}` | undefined; isLoading: boolean; refetch: () => void };
}

/**
 * Get the locked LP token balance
 */
export function useLockerBalance(lockerAddress?: `0x${string}`) {
  return useReadContract({
    address: lockerAddress,
    abi: LPLockerABI,
    functionName: 'getLPBalance',
    query: {
      enabled: !!lockerAddress,
    },
  }) as { data: bigint | undefined; isLoading: boolean; refetch: () => void };
}

/**
 * Check if the connected wallet is the owner
 */
export function useIsLockerOwner(lockerAddress?: `0x${string}`) {
  const { address } = useAccount();
  const { data: owner } = useLockerOwner(lockerAddress);
  return address && owner ? address.toLowerCase() === owner.toLowerCase() : false;
}

/**
 * Check if the connected wallet is the pending owner
 */
export function useIsPendingOwner(lockerAddress?: `0x${string}`) {
  const { address } = useAccount();
  const { data: pendingOwner } = useLockerPendingOwner(lockerAddress);
  return address && pendingOwner && pendingOwner !== '0x0000000000000000000000000000000000000000' 
    ? address.toLowerCase() === pendingOwner.toLowerCase() 
    : false;
}
