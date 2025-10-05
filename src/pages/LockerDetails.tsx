import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  useLPLocker, 
  useLockerOwner,
  useLockerPendingOwner,
  useLockerLPToken,
  useLockerFeeReceiver,
  useLockerBalance,
  useIsLockerOwner,
  useIsPendingOwner
} from '@/hooks/web3/useLPLocker';
import { useLockerLocks } from '@/hooks/web3/useUserLocks';
import { useTokenMetadata, useTokenBalance, useTokenAllowance, useERC20 } from '@/hooks/web3/useERC20';
import { formatTokenAmount } from '@/lib/web3/utils';
import { LockCard } from '@/components/web3/LockCard';

export default function LockerDetails() {
  const { lockerAddress } = useParams();
  const { address, isConnected } = useAccount();
  const validAddress = lockerAddress as `0x${string}`;

  const [lockAmount, setLockAmount] = useState('');
  const [topUpLockId, setTopUpLockId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newFeeReceiver, setNewFeeReceiver] = useState('');
  const [isPending, setIsPending] = useState(false);

  const { data: owner } = useLockerOwner(validAddress);
  const { data: pendingOwner } = useLockerPendingOwner(validAddress);
  const { data: lpToken } = useLockerLPToken(validAddress);
  const { data: feeReceiver } = useLockerFeeReceiver(validAddress);
  const { data: lockedBalance } = useLockerBalance(validAddress);
  const isOwner = useIsLockerOwner(validAddress);
  const isPendingOwnerRole = useIsPendingOwner(validAddress);

  const { lockIds, isLoading: isLoadingLocks, refetch: refetchLocks } = useLockerLocks(validAddress);
  const { data: tokenMetadata } = useTokenMetadata(lpToken);
  const { data: userBalance, refetch: refetchBalance } = useTokenBalance(lpToken);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(lpToken, validAddress);

  const locker = useLPLocker(validAddress);
  const token = useERC20(lpToken);

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

  if (!lockerAddress) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xs text-muted-foreground">invalid locker address</p>
      </div>
    );
  }

  const handleLockLiquidity = async () => {
    if (!lockAmount || !tokenMetadata) return;
    setIsPending(true);
    try {
      const amount = parseUnits(lockAmount, tokenMetadata.decimals);
      await locker.lockLiquidity(amount);
      toast({ description: 'liquidity locked successfully!' });
      setLockAmount('');
      refetchLocks();
      refetchBalance();
      refetchAllowance();
    } catch (error: any) {
      toast({ description: error.message || 'failed to lock liquidity', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleApproveLock = async () => {
    if (!lockAmount || !tokenMetadata || !lpToken) return;
    setIsPending(true);
    try {
      const amount = parseUnits(lockAmount, tokenMetadata.decimals);
      await token.approve(validAddress, amount);
      toast({ description: 'approval successful! you can now lock liquidity' });
      refetchAllowance();
    } catch (error: any) {
      toast({ description: error.message || 'approval failed', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleTopUpLock = async () => {
    if (!topUpLockId || !topUpAmount || !tokenMetadata) return;
    setIsPending(true);
    try {
      const amount = parseUnits(topUpAmount, tokenMetadata.decimals);
      await locker.topUpLock(topUpLockId, amount);
      toast({ description: 'lock topped up successfully!' });
      setTopUpLockId('');
      setTopUpAmount('');
      refetchLocks();
      refetchBalance();
      refetchAllowance();
    } catch (error: any) {
      toast({ description: error.message || 'failed to top up lock', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleApproveTopUp = async () => {
    if (!topUpAmount || !tokenMetadata || !lpToken) return;
    setIsPending(true);
    try {
      const amount = parseUnits(topUpAmount, tokenMetadata.decimals);
      await token.approve(validAddress, amount);
      toast({ description: 'approval successful! you can now top up' });
      refetchAllowance();
    } catch (error: any) {
      toast({ description: error.message || 'approval failed', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleTriggerWithdrawal = async (lockId: string) => {
    setIsPending(true);
    try {
      await locker.triggerWithdrawal(lockId);
      toast({ description: 'withdrawal triggered!' });
      refetchLocks();
    } catch (error: any) {
      toast({ description: error.message || 'failed to trigger withdrawal', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleCancelWithdrawal = async (lockId: string) => {
    setIsPending(true);
    try {
      await locker.cancelWithdrawalTrigger(lockId);
      toast({ description: 'withdrawal cancelled!' });
      refetchLocks();
    } catch (error: any) {
      toast({ description: error.message || 'failed to cancel withdrawal', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleWithdraw = async (lockId: string, amount: bigint) => {
    setIsPending(true);
    try {
      await locker.withdrawLP(lockId, amount);
      toast({ description: 'lp tokens withdrawn!' });
      refetchLocks();
    } catch (error: any) {
      toast({ description: error.message || 'failed to withdraw', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleClaimFees = async (lockId: string) => {
    setIsPending(true);
    try {
      await locker.claimLPFees(lockId);
      toast({ description: 'fees claimed successfully!' });
      refetchLocks();
    } catch (error: any) {
      toast({ description: error.message || 'failed to claim fees', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleAcceptOwnership = async () => {
    setIsPending(true);
    try {
      await locker.acceptOwnership();
      toast({ description: 'ownership accepted!' });
    } catch (error: any) {
      toast({ description: error.message || 'failed to accept ownership', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwner || !newOwner.startsWith('0x') || newOwner.length !== 42) {
      toast({ description: 'invalid address', variant: 'destructive' });
      return;
    }
    setIsPending(true);
    try {
      await locker.transferOwnership(newOwner as `0x${string}`);
      toast({ description: 'ownership transferred!' });
      setNewOwner('');
    } catch (error: any) {
      toast({ description: error.message || 'failed to transfer ownership', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleChangeFeeReceiver = async () => {
    if (!newFeeReceiver || !newFeeReceiver.startsWith('0x') || newFeeReceiver.length !== 42) {
      toast({ description: 'invalid address', variant: 'destructive' });
      return;
    }
    setIsPending(true);
    try {
      await locker.changeFeeReceiver(newFeeReceiver as `0x${string}`);
      toast({ description: 'fee receiver updated!' });
      setNewFeeReceiver('');
    } catch (error: any) {
      toast({ description: error.message || 'failed to update fee receiver', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xs tracking-tight font-medium">
          aerolock
        </Link>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const shareUrl = `${window.location.origin}/locked/${validAddress}`;
              navigator.clipboard.writeText(shareUrl);
              toast({ 
                title: '🎉 share link copied!',
                description: 'share this with your community to show locked liquidity'
              });
            }}
          >
            📋 copy share link
          </Button>
          <Link to="/lockers">
            <Button variant="ghost" size="sm">
              dashboard
            </Button>
          </Link>
          <WalletButton />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Back link */}
          <Link to="/lockers" className="text-xs text-muted-foreground hover:text-foreground">
            ← back to lockers
          </Link>

          {/* Locker Info */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xs text-muted-foreground mb-2">locker contract</h2>
                <AddressDisplay address={validAddress} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">lp token</p>
                  {lpToken && <AddressDisplay address={lpToken} showLink={false} />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">owner</p>
                  {owner && <AddressDisplay address={owner} showLink={false} />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">fee receiver</p>
                  {feeReceiver && <AddressDisplay address={feeReceiver} showLink={false} />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">locked balance</p>
                  <p className="text-xs font-medium">
                    {lockedBalance !== undefined && tokenMetadata
                      ? `${formatTokenAmount(lockedBalance, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
                      : '...'}
                  </p>
                </div>
              </div>

              {/* Accept Ownership Button */}
              {isPendingOwnerRole && (
                <div className="pt-4 border-t border-amber-500/20 bg-amber-500/10 p-4 rounded">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                    🎯 You have a pending ownership transfer!
                  </p>
                  <Button size="sm" onClick={handleAcceptOwnership} disabled={isPending}>
                    accept ownership
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Lock Liquidity */}
          <Card className="p-6">
            <h2 className="text-xs font-medium mb-4">create new lock</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">amount</Label>
                <Input
                  type="text"
                  placeholder="0.0"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                  className="text-xs"
                />
                {userBalance !== undefined && tokenMetadata && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      your balance: {formatUnits(userBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setLockAmount(formatUnits(userBalance, tokenMetadata.decimals));
                      }}
                      disabled={userBalance === 0n}
                      className="h-5 px-2 text-[10px]"
                    >
                      max
                    </Button>
                  </div>
                )}
              </div>
              
              {(() => {
                if (!lockAmount || !tokenMetadata) return null;
                const amount = parseUnits(lockAmount, tokenMetadata.decimals);
                const needsApproval = !allowance || allowance < amount;
                
                return needsApproval ? (
                  <Button size="sm" onClick={handleApproveLock} disabled={isPending}>
                    {isPending ? 'approving...' : 'approve token'}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleLockLiquidity} disabled={isPending}>
                    {isPending ? 'locking...' : 'lock liquidity'}
                  </Button>
                );
              })()}
            </div>
          </Card>

          {/* Admin Functions - Only for Owner */}
          {isOwner && (
            <Card className="p-6">
              <h2 className="text-xs font-medium mb-4">owner functions</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">transfer ownership</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={newOwner}
                      onChange={(e) => setNewOwner(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <Button size="sm" onClick={handleTransferOwnership} disabled={isPending || !newOwner}>
                      transfer
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    new owner must call acceptOwnership to complete transfer
                  </p>
                </div>

                <div>
                  <Label className="text-xs">change fee receiver</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={newFeeReceiver}
                      onChange={(e) => setNewFeeReceiver(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <Button size="sm" onClick={handleChangeFeeReceiver} disabled={isPending || !newFeeReceiver}>
                      update
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    update the address that receives claimed fees
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Top Up Lock */}
          <Card className="p-6">
            <h2 className="text-xs font-medium mb-4">top up existing lock</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">lock id</Label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={topUpLockId}
                  onChange={(e) => setTopUpLockId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">amount</Label>
                <Input
                  type="text"
                  placeholder="0.0"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="text-xs"
                />
                {userBalance !== undefined && tokenMetadata && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      your balance: {formatUnits(userBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setTopUpAmount(formatUnits(userBalance, tokenMetadata.decimals));
                      }}
                      disabled={userBalance === 0n}
                      className="h-5 px-2 text-[10px]"
                    >
                      max
                    </Button>
                  </div>
                )}
              </div>
              
              {(() => {
                if (!topUpAmount || !tokenMetadata) return (
                  <Button size="sm" disabled>
                    top up lock
                  </Button>
                );
                
                const amount = parseUnits(topUpAmount, tokenMetadata.decimals);
                const needsApproval = !allowance || allowance < amount;
                
                return needsApproval ? (
                  <Button size="sm" onClick={handleApproveTopUp} disabled={isPending || !topUpLockId}>
                    {isPending ? 'approving...' : 'approve token'}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleTopUpLock} disabled={isPending || !topUpLockId}>
                    {isPending ? 'topping up...' : 'top up lock'}
                  </Button>
                );
              })()}
            </div>
          </Card>

          {/* Locks List */}
          <div className="space-y-4">
            <h2 className="text-xs font-medium">your locks</h2>
            
            {isLoadingLocks && (
              <div className="text-xs text-muted-foreground">loading locks...</div>
            )}

            {!isLoadingLocks && lockIds.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-xs text-muted-foreground">no locks created yet</p>
              </Card>
            )}

            {!isLoadingLocks && lockIds.length > 0 && (
              <div className="space-y-3">
                {lockIds.map((lockId) => (
                  <LockCard
                    key={lockId}
                    lockerAddress={validAddress}
                    lockId={lockId}
                    onTriggerWithdrawal={handleTriggerWithdrawal}
                    onCancelWithdrawal={handleCancelWithdrawal}
                    onWithdraw={handleWithdraw}
                    onClaimFees={handleClaimFees}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
