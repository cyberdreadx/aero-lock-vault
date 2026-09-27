import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import { multicallRead } from '@/lib/web3/baseReads';
import type { LockStatus } from '@/types/web3';

export interface LockState {
  lockId: `0x${string}`;
  amount: bigint;
  /** when a triggered withdrawal becomes possible (null while no withdrawal is pending) */
  unlocksAt: Date | null;
  status: LockStatus;
}

/** Live state of every lock in a locker, read in one batched call. */
export async function fetchLockStates(locker: `0x${string}`): Promise<LockState[]> {
  const idsData = await multicallRead([
    { target: locker, callData: encodeFunctionData({ abi: LPLockerABI, functionName: 'getAllLockIds' }) },
  ]);
  if (!idsData[0]) return [];
  const ids = decodeFunctionResult({ abi: LPLockerABI, functionName: 'getAllLockIds', data: idsData[0] }) as readonly `0x${string}`[];

  const infos = await multicallRead(
    ids.map((lockId) => ({
      target: locker,
      callData: encodeFunctionData({ abi: LPLockerABI, functionName: 'getLockInfo', args: [lockId] }),
    })),
  );

  const now = Date.now();
  return ids.flatMap((lockId, i) => {
    const data = infos[i];
    if (!data) return [];
    const [, , , amount, lockUpEndTime, isLiquidityLocked, isWithdrawalTriggered] = decodeFunctionResult({
      abi: LPLockerABI,
      functionName: 'getLockInfo',
      data,
    }) as readonly [string, string, string, bigint, bigint, boolean, boolean];
    const unlocksAt = isWithdrawalTriggered && lockUpEndTime > 0n ? new Date(Number(lockUpEndTime) * 1000) : null;
    const status: LockStatus = !isLiquidityLocked
      ? 'withdrawn'
      : unlocksAt
        ? unlocksAt.getTime() <= now ? 'unlocked' : 'triggered'
        : 'active';
    return [{ lockId, amount, unlocksAt, status }];
  });
}

export function useLockStatuses(locker?: `0x${string}`) {
  return useQuery({
    queryKey: ['lock-states', locker],
    enabled: !!locker,
    staleTime: 30_000,
    queryFn: () => fetchLockStates(locker!),
  });
}
