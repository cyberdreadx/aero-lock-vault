import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetLockInfo, useGetClaimableFees, useGetTotalAccumulatedFees, useLPLocker } from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { getLockStatus, formatTokenAmount, calculateUnlockDate, getTimeRemaining } from '@/lib/web3/utils';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { LockStatus } from '@/types/web3';

const STATUS_STYLES: Record<LockStatus, string> = {
  active: 'border-success/40 bg-success/10 text-success',
  triggered: 'border-warning/40 bg-warning/10 text-warning',
  unlocked: 'border-foreground/40 bg-foreground text-background',
  withdrawn: 'border-border bg-muted text-muted-foreground',
};

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
  const { data: claimableFees, refetch: refetchClaimable } = useGetClaimableFees(lockerAddress, lockId);
  const { data: totalFees, refetch: refetchTotal } = useGetTotalAccumulatedFees(lockerAddress, lockId);
  const tokenAddr = (lockData ? (lockData[2] as `0x${string}`) : undefined);
  const { data: tokenMetadata } = useTokenMetadata(tokenAddr);
  
  const token0Addr = claimableFees ? (claimableFees[0] as `0x${string}`) : undefined;
  const token1Addr = claimableFees ? (claimableFees[2] as `0x${string}`) : undefined;
  const { data: token0Metadata } = useTokenMetadata(token0Addr);
  const { data: token1Metadata } = useTokenMetadata(token1Addr);

  const locker = useLPLocker(lockerAddress);
  const [refreshingFees, setRefreshingFees] = useState(false);
  const handleRefreshFees = async () => {
    try {
      setRefreshingFees(true);
      await locker.updateClaimableFees(lockId);
      await Promise.all([refetchClaimable(), refetchTotal()]);
      toast({ description: 'fees updated' });
    } catch (e: any) {
      toast({ description: e.message || 'failed to refresh fees', variant: 'destructive' });
    } finally {
      setRefreshingFees(false);
    }
  };

  if (!lockData) {
    return (
      <Card className="h-40 p-5 animate-pulse bg-muted/30">
        <span className="sr-only">loading lock data...</span>
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
    <Card className="p-4 sm:p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">lock id</p>
            <div className="flex items-center gap-1">
              <p className="text-xs font-mono">{lock.lockId.slice(0, 8)}...{lock.lockId.slice(-6)}</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="copy lock id"
                className="h-8 w-8 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(lock.lockId);
                  toast({ description: 'lock id copied!' });
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-right min-w-0">
            <p className="font-mono tabular text-sm font-medium truncate max-w-full">
              {tokenMetadata ? formatTokenAmount(lock.amount, tokenMetadata.decimals) : '...'} {tokenMetadata?.symbol}
            </p>
            <span className={cn('border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', STATUS_STYLES[status])}>
              {status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t text-[10px]">
          <div>
            <span className="text-muted-foreground">unlock time</span>
            <p className="font-mono text-xs font-medium">{timeRemaining}</p>
          </div>
          <div>
            <span className="text-muted-foreground">owner</span>
            <p className="text-xs font-medium">{isOwnLock ? 'you' : lock.owner.slice(0, 6)}</p>
          </div>
        </div>

        {totalFees && (
          <div className="pt-3 border-t">
            <p className="text-[10px] text-muted-foreground mb-2">total fees earned</p>
            <div className="space-y-1 text-xs">
              {token0Metadata && (
                <div className="flex justify-between">
                  <span>{token0Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(totalFees[1] ?? 0n, token0Metadata.decimals)}</span>
                </div>
              )}
              {token1Metadata && (
                <div className="flex justify-between">
                  <span>{token1Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(totalFees[3] ?? 0n, token1Metadata.decimals)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {claimableFees && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground">claimable now</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-6 sm:w-6"
                onClick={handleRefreshFees}
                disabled={refreshingFees}
                aria-label="refresh fees"
                title="refresh fees"
              >
                <RefreshCw className={`h-3 w-3 ${refreshingFees ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              {token0Metadata && (
                <div className="flex justify-between">
                  <span>{token0Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(claimableFees[1] ?? 0n, token0Metadata.decimals)}</span>
                </div>
              )}
              {token1Metadata && (
                <div className="flex justify-between">
                  <span>{token1Metadata.symbol}</span>
                  <span className="font-mono">{formatTokenAmount(claimableFees[3] ?? 0n, token1Metadata.decimals)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isOwnLock && (
          <div className="grid grid-cols-2 gap-2 pt-3 border-t sm:flex sm:flex-wrap">
            {status === 'active' && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs"
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
                className="text-xs"
                onClick={() => onCancelWithdrawal(lock.lockId)}
                disabled={isPending}
              >
                cancel withdrawal
              </Button>
            )}
            {status === 'unlocked' && (
              <Button 
                size="sm"
                className="text-xs"
                onClick={() => onWithdraw(lock.lockId, lock.amount)}
                disabled={isPending}
              >
                withdraw
              </Button>
            )}
            <Button 
              size="sm" 
              variant="secondary"
              className="text-xs"
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
