import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
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
import { formatTokenAmount, sanitizeAmountInput } from '@/lib/web3/utils';
import { LockCard } from '@/components/web3/LockCard';
import { ArrowLeft, Copy, ExternalLink, Github, Share2 } from 'lucide-react';
import sourceCode from '@/assets/locker-source.sol?raw';

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
      <ConnectGate
        title="connect wallet"
        description="connect to manage this locker, create locks and claim fees."
      />
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
      toast({ 
        description: 'ownership transfer initiated! the new owner must call "accept ownership" to complete the transfer.',
        duration: 6000
      });
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

  const balanceLabel =
    lockedBalance !== undefined && tokenMetadata
      ? `${formatTokenAmount(lockedBalance, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
      : '...';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="container px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <Link
            to="/lockers"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            back to lockers
          </Link>

          <PageHeading
            eyebrow="locker"
            title={tokenMetadata ? `${tokenMetadata.symbol} locker` : 'locker'}
            description={<AddressDisplay address={validAddress} />}
            actions={
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to={`/locked/${validAddress}`}>
                  <Share2 className="h-3.5 w-3.5" />
                  share with community
                </Link>
              </Button>
            }
          />

          {/* Accept Ownership Button */}
          {isPendingOwnerRole && (
            <div className="flex flex-col gap-3 border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-warning">you have a pending ownership transfer for this locker</p>
              <Button size="sm" className="text-xs" onClick={handleAcceptOwnership} disabled={isPending}>
                accept ownership
              </Button>
            </div>
          )}

          {/* Locker Info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            <div className="col-span-2 lg:col-span-1 bg-card p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">locked balance</p>
              <p className="font-mono tabular text-lg sm:text-xl font-medium truncate">{balanceLabel}</p>
            </div>
            <div className="bg-card p-4 sm:p-5 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">lp token</p>
              {lpToken && <AddressDisplay address={lpToken} showLink={false} />}
            </div>
            <div className="bg-card p-4 sm:p-5 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">owner</p>
              {owner && <AddressDisplay address={owner} showLink={false} />}
            </div>
            <div className="col-span-2 lg:col-span-1 bg-card p-4 sm:p-5 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">fee receiver</p>
              {feeReceiver && <AddressDisplay address={feeReceiver} showLink={false} />}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Actions: first on mobile, right-hand column on desktop */}
            <aside className="min-w-0 space-y-6 lg:col-span-5 lg:col-start-8 lg:row-start-1">
              {/* Lock Liquidity */}
              <Card className="p-5 sm:p-6">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">create new lock</h2>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1.5 block text-xs">amount</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      placeholder="0.0"
                      value={lockAmount}
                      onChange={(e) => setLockAmount(sanitizeAmountInput(e.target.value))}
                      className="font-mono tabular"
                    />
                    {userBalance !== undefined && tokenMetadata && (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="min-w-0 text-[10px] text-muted-foreground truncate">
                          your balance: {formatUnits(userBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setLockAmount(formatUnits(userBalance, tokenMetadata.decimals));
                          }}
                          disabled={userBalance === 0n}
                          className="h-8 shrink-0 px-3 text-[10px] uppercase tracking-wider sm:h-6"
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
                      <Button className="w-full h-11 sm:h-10 text-xs" onClick={handleApproveLock} disabled={isPending}>
                        {isPending ? 'approving...' : 'approve token'}
                      </Button>
                    ) : (
                      <Button className="w-full h-11 sm:h-10 text-xs" onClick={handleLockLiquidity} disabled={isPending}>
                        {isPending ? 'locking...' : 'lock liquidity'}
                      </Button>
                    );
                  })()}
                </div>
              </Card>

              {/* Top Up Lock */}
              <Card className="p-5 sm:p-6">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">top up existing lock</h2>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1.5 block text-xs">lock id</Label>
                    <Input
                      type="text"
                      placeholder="0x..."
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                      value={topUpLockId}
                      onChange={(e) => setTopUpLockId(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">amount</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      placeholder="0.0"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(sanitizeAmountInput(e.target.value))}
                      className="font-mono tabular"
                    />
                    {userBalance !== undefined && tokenMetadata && (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="min-w-0 text-[10px] text-muted-foreground truncate">
                          your balance: {formatUnits(userBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setTopUpAmount(formatUnits(userBalance, tokenMetadata.decimals));
                          }}
                          disabled={userBalance === 0n}
                          className="h-8 shrink-0 px-3 text-[10px] uppercase tracking-wider sm:h-6"
                        >
                          max
                        </Button>
                      </div>
                    )}
                  </div>
              
                  {(() => {
                    if (!topUpAmount || !tokenMetadata) return (
                      <Button className="w-full h-11 sm:h-10 text-xs" disabled>
                        top up lock
                      </Button>
                    );
                
                    const amount = parseUnits(topUpAmount, tokenMetadata.decimals);
                    const needsApproval = !allowance || allowance < amount;
                
                    return needsApproval ? (
                      <Button className="w-full h-11 sm:h-10 text-xs" onClick={handleApproveTopUp} disabled={isPending || !topUpLockId}>
                        {isPending ? 'approving...' : 'approve token'}
                      </Button>
                    ) : (
                      <Button className="w-full h-11 sm:h-10 text-xs" onClick={handleTopUpLock} disabled={isPending || !topUpLockId}>
                        {isPending ? 'topping up...' : 'top up lock'}
                      </Button>
                    );
                  })()}
                </div>
              </Card>

              {/* Admin Functions - Only for Owner */}
              {isOwner && (
                <Card className="p-5 sm:p-6">
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">owner functions</h2>
                  <div className="space-y-4">
                    {pendingOwner && pendingOwner !== '0x0000000000000000000000000000000000000000' && (
                      <div className="p-3 bg-warning/10 border border-warning/30">
                        <p className="text-[10px] text-warning mb-2">
                          ⏳ pending ownership transfer
                        </p>
                        <div className="text-[10px]">
                          <span className="text-muted-foreground">waiting for </span>
                          <AddressDisplay address={pendingOwner} showLink={false} />
                          <span className="text-muted-foreground"> to accept</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="mb-1.5 block text-xs">transfer ownership</Label>
                      <p className="text-[10px] text-muted-foreground mb-2">new owner must accept to complete transfer</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="text"
                          placeholder="0x..."
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                          value={newOwner}
                          onChange={(e) => setNewOwner(e.target.value)}
                          className="font-mono"
                        />
                        <Button className="h-11 sm:h-10 text-xs sm:w-auto" onClick={handleTransferOwnership} disabled={isPending || !newOwner}>
                          transfer
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        new owner must call acceptOwnership to complete transfer
                      </p>
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs">change fee receiver</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="text"
                          placeholder="0x..."
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                          value={newFeeReceiver}
                          onChange={(e) => setNewFeeReceiver(e.target.value)}
                          className="font-mono"
                        />
                        <Button className="h-11 sm:h-10 text-xs sm:w-auto" onClick={handleChangeFeeReceiver} disabled={isPending || !newFeeReceiver}>
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

            </aside>

            <div className="min-w-0 space-y-6 lg:col-span-7 lg:row-start-1">
              {/* Locks List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">locks</h2>
                  {!isLoadingLocks && (
                    <span className="font-mono text-[10px] text-muted-foreground">{lockIds.length} total</span>
                  )}
                </div>
            
                {isLoadingLocks && (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-40 border border-border bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                )}

                {!isLoadingLocks && lockIds.length === 0 && (
                  <Card className="border-dashed p-10 text-center">
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

              {/* Contract Verification Info */}
              <Card className="p-5 sm:p-6">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">contract verification</h2>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    verify this locker contract on basescan for full transparency
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 border border-border bg-muted/30 p-3 font-mono text-[10px] text-muted-foreground sm:grid-cols-4">
                    <p>solidity 0.8.20</p>
                    <p>optimizer on</p>
                    <p>MIT license</p>
                    <p>identical bytecode</p>
                  </div>
                  <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <a href={`https://basescan.org/address/${validAddress}`} target="_blank" rel="noopener noreferrer">
                        basescan <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(sourceCode);
                        toast({ description: 'source code copied to clipboard!' });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      copy source
                    </Button>
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <a href="https://github.com/cyberdreadx/aero-lock-vault" target="_blank" rel="noopener noreferrer">
                        <Github className="h-3 w-3" /> github
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <a href="https://x.com/aerolockvault" target="_blank" rel="noopener noreferrer">
                        contact on X
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
