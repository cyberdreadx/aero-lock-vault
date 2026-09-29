import { useQuery } from '@tanstack/react-query';
import { decodeFunctionResult, encodeFunctionData, erc20Abi, parseAbi } from 'viem';
import { multicallRead } from '@/lib/web3/baseReads';
import { AERODROME } from '@/lib/web3/constants';
import { fetchLockStates } from './useLockStatuses';

const POOL_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);

export interface LockerSummary {
  symbol: string;
  decimals: number;
  isLP: boolean;
  /** tokens held by the locker */
  balance: bigint;
  status: 'locked' | 'pending' | 'withdrawable' | 'empty';
  /** earliest unlock of a pending withdrawal */
  unlocksAt: Date | null;
}

/** What a 30-day-notice locker holds and its overall state, for dashboard cards. */
export function useLockerSummary(locker: `0x${string}`, token: `0x${string}`) {
  return useQuery({
    queryKey: ['locker-summary', locker.toLowerCase()],
    staleTime: 30_000,
    queryFn: async (): Promise<LockerSummary> => {
      const [meta, states] = await Promise.all([
        multicallRead([
          { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'symbol' }) },
          { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'decimals' }) },
          { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [locker] }) },
          { target: AERODROME.FACTORY as `0x${string}`, callData: encodeFunctionData({ abi: POOL_ABI, functionName: 'isPool', args: [token] }) },
        ]),
        fetchLockStates(locker),
      ]);
      const live = states.filter((s) => s.status !== 'withdrawn');
      const pending = live.filter((s) => s.status === 'triggered');
      return {
        symbol: meta[0] ? decodeFunctionResult({ abi: erc20Abi, functionName: 'symbol', data: meta[0] }) : '???',
        decimals: meta[1] ? decodeFunctionResult({ abi: erc20Abi, functionName: 'decimals', data: meta[1] }) : 18,
        balance: meta[2] ? decodeFunctionResult({ abi: erc20Abi, functionName: 'balanceOf', data: meta[2] }) : 0n,
        isLP: meta[3] ? decodeFunctionResult({ abi: POOL_ABI, functionName: 'isPool', data: meta[3] }) : false,
        status:
          live.length === 0
            ? 'empty'
            : live.some((s) => s.status === 'unlocked')
              ? 'withdrawable'
              : pending.length > 0
                ? 'pending'
                : 'locked',
        unlocksAt: pending.map((s) => s.unlocksAt!).sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
      };
    },
  });
}
