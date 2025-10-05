import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetLockInfo, useGetClaimableFees } from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { getLockStatus, formatTokenAmount, calculateUnlockDate, getTimeRemaining } from '@/lib/web3/utils';
import { Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const { data: claimableFees } = useGetClaimableFees(lockerAddress, lockId);
  const tokenAddr = (lockData ? (lockData[2] as `0x${string}`) : undefined);
  const { data: tokenMetadata } = useTokenMetadata(tokenAddr);
  
  const token0Addr = claimableFees ? (claimableFees[0] as `0x${string}`) : undefined;
  const token1Addr = claimableFees ? (claimableFees[2] as `0x${string}`) : undefined;
  const { data: token0Metadata } = useTokenMetadata(token0Addr);
  const { data: token1Metadata } = useTokenMetadata(token1Addr);

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
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono">{lock.lockId.slice(0, 10)}...{lock.lockId.slice(-8)}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(lock.lockId);
                  toast({ description: 'lock id copied!' });
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
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

        {claimableFees && (claimableFees[1] > 0n || claimableFees[3] > 0n) && (
          <div className="pt-3 border-t">
            <p className="text-[10px] text-muted-foreground mb-2">claimable fees</p>
            <div className="space-y-1 text-[10px]">
              {claimableFees[1] > 0n && token0Metadata && (
                <div className="flex justify-between">
                  <span>{token0Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(claimableFees[1], token0Metadata.decimals)}</span>
                </div>
              )}
              {claimableFees[3] > 0n && token1Metadata && (
                <div className="flex justify-between">
                  <span>{token1Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(claimableFees[3], token1Metadata.decimals)}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
