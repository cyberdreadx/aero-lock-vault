import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetLockInfo } from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { getLockStatus, formatTokenAmount, calculateUnlockDate, getTimeRemaining } from '@/lib/web3/utils';

interface LockCardProps {
  lockerAddress: `0x${string}`;
  lockId: string;
  onTriggerWithdrawal: (lockId: string) => void;
  onCancelWithdrawal: (lockId: string) => void;
  onWithdraw: (lockId: string, amount: bigint) => void;
  onClaimFees: (lockId: string) => void;
  isPending: boolean;
}

export function LockCard({
  lockerAddress,
  lockId,
  onTriggerWithdrawal,
  onCancelWithdrawal,
  onWithdraw,
  onClaimFees,
  isPending,
}: LockCardProps) {
  const { address } = useAccount();
  const { data: lockData } = useGetLockInfo(lockerAddress, lockId);

  if (!lockData) {
    return (
      <Card className="p-5">
        <div className="text-xs text-muted-foreground">loading lock data...</div>
      </Card>
    );
  }

  const [owner, feeReceiver, tokenContract, amount, lockUpEndTime, isLiquidityLocked, isWithdrawalTriggered] = lockData;
  const lock = {
    lockId,
    owner: owner as `0x${string}`,
    feeReceiver: feeReceiver as `0x${string}`,
    tokenContract: tokenContract as `0x${string}`,
    amount,
    lockUpEndTime,
    isLiquidityLocked,
    isWithdrawalTriggered,
  };

  const { data: tokenMetadata } = useTokenMetadata(tokenContract as `0x${string}`);
  const status = getLockStatus(lock);
  const unlockDate = calculateUnlockDate(lock.lockUpEndTime);
  const timeRemaining = getTimeRemaining(unlockDate);
  const isOwnLock = address && lock.owner.toLowerCase() === address.toLowerCase();

  return (
    <Card className="p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">lock id</p>
            <p className="text-xs font-mono">{lock.lockId.slice(0, 10)}...{lock.lockId.slice(-8)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium">
              {tokenMetadata ? formatTokenAmount(lock.amount, tokenMetadata.decimals) : '...'} {tokenMetadata?.symbol}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">{status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t text-[10px]">
          <div>
            <span className="text-muted-foreground">unlock time</span>
            <p className="text-xs font-medium">{timeRemaining}</p>
          </div>
          <div>
            <span className="text-muted-foreground">owner</span>
            <p className="text-xs font-medium">{isOwnLock ? 'you' : lock.owner.slice(0, 6)}</p>
          </div>
        </div>

        {isOwnLock && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {status === 'active' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onTriggerWithdrawal(lock.lockId)}
                disabled={isPending}
              >
                trigger withdrawal
              </Button>
            )}
            {status === 'triggered' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onCancelWithdrawal(lock.lockId)}
                disabled={isPending}
              >
                cancel withdrawal
              </Button>
            )}
            {status === 'unlocked' && (
              <Button 
                size="sm"
                onClick={() => onWithdraw(lock.lockId, lock.amount)}
                disabled={isPending}
              >
                withdraw
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onClaimFees(lock.lockId)}
              disabled={isPending}
            >
              claim fees
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
