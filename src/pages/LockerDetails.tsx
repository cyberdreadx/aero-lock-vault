import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { toast } from '@/hooks/use-toast';
import { useGetLockInfo, useLPLocker } from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { formatTokenAmount, getLockStatus, calculateUnlockDate, getTimeRemaining } from '@/lib/web3/utils';

export default function LockDetails() {
  const { lockId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: lockData, isLoading, refetch } = useGetLockInfo(lockId);
  const { triggerWithdrawal, cancelWithdrawalTrigger, withdrawLP, claimLPFees, topUpLock } = useLPLocker();

  // Parse the lock data tuple
  const lock = lockData ? {
    owner: lockData[0] as `0x${string}`,
    feeReceiver: lockData[1] as `0x${string}`,
    tokenContract: lockData[2] as `0x${string}`,
    amount: lockData[3],
    lockUpEndTime: lockData[4],
    isLiquidityLocked: lockData[5],
    isWithdrawalTriggered: lockData[6],
  } : null;

  const { data: tokenMetadata } = useTokenMetadata(lock?.tokenContract);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-sm tracking-tight">connect wallet</h1>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xs">loading...</p>
      </div>
    );
  }

  if (!lock || !lockId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xs">lock not found</p>
      </div>
    );
  }

  const status = getLockStatus(lock);
  const unlockDate = calculateUnlockDate(lock.lockUpEndTime);
  const timeRemaining = getTimeRemaining(unlockDate);
  const isOwner = address === lock.owner;

  const handleTriggerWithdrawal = async () => {
    setIsProcessing(true);
    try {
      await triggerWithdrawal(lockId);
      toast({ description: 'withdrawal triggered' });
      await refetch();
    } catch (error: any) {
      toast({ description: error.message || 'failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelTrigger = async () => {
    setIsProcessing(true);
    try {
      await cancelWithdrawalTrigger(lockId);
      toast({ description: 'trigger cancelled' });
      await refetch();
    } catch (error: any) {
      toast({ description: error.message || 'failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !tokenMetadata) return;
    setIsProcessing(true);
    try {
      const amount = parseUnits(withdrawAmount, tokenMetadata.decimals);
      await withdrawLP(lockId, amount);
      toast({ description: 'withdrawn' });
      navigate('/app');
    } catch (error: any) {
      toast({ description: error.message || 'failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFees = async () => {
    setIsProcessing(true);
    try {
      await claimLPFees(lockId);
      toast({ description: 'fees claimed' });
    } catch (error: any) {
      toast({ description: error.message || 'failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpAmount || !tokenMetadata) return;
    setIsProcessing(true);
    try {
      const amount = parseUnits(topUpAmount, tokenMetadata.decimals);
      await topUpLock(lockId, amount);
      toast({ description: 'topped up' });
      setTopUpAmount('');
      await refetch();
    } catch (error: any) {
      toast({ description: error.message || 'failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xs tracking-tight font-medium">
          aerolock
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/lockers">
            <Button variant="ghost" size="sm">
              dashboard
            </Button>
          </Link>
          <WalletButton />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-sm tracking-tight mb-1">lock #{lockId.slice(0, 10)}...</h1>
            <p className="text-xs text-muted-foreground">
              status: <span className="text-foreground">{status}</span>
            </p>
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">owner</p>
                <AddressDisplay address={lock.owner} showLink={false} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">lp token</p>
                <AddressDisplay address={lock.tokenContract} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">amount</p>
                <p>{formatTokenAmount(lock.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">unlock</p>
                <p>{timeRemaining}</p>
              </div>
            </div>
          </div>

          {isOwner && (
            <>
              <div className="border border-border p-6 space-y-4">
                <h2 className="text-xs font-medium">actions</h2>
                
                {status === 'active' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">start 30-day withdrawal countdown</p>
                    <Button
                      onClick={handleTriggerWithdrawal}
                      disabled={isProcessing}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      trigger withdrawal
                    </Button>
                  </div>
                )}

                {status === 'triggered' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">countdown active. cancel to reset timer.</p>
                    <Button
                      onClick={handleCancelTrigger}
                      disabled={isProcessing}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      cancel withdrawal countdown
                    </Button>
                  </div>
                )}

                {status === 'unlocked' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">30-day countdown complete. ready to withdraw.</p>
                    <Label htmlFor="withdraw" className="text-xs">withdraw amount</Label>
                    <Input
                      id="withdraw"
                      type="number"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      onClick={handleWithdraw}
                      disabled={isProcessing || !withdrawAmount}
                      size="sm"
                      className="w-full"
                    >
                      withdraw tokens
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleClaimFees}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  claim fees
                </Button>
              </div>

              {status === 'active' && (
                <div className="border border-border p-6 space-y-4">
                  <h2 className="text-xs font-medium">top up lock</h2>
                  <div className="space-y-2">
                    <Label htmlFor="topup" className="text-xs">additional amount</Label>
                    <Input
                      id="topup"
                      type="number"
                      placeholder="0.0"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      onClick={handleTopUp}
                      disabled={isProcessing || !topUpAmount}
                      size="sm"
                      className="w-full"
                    >
                      top up
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
