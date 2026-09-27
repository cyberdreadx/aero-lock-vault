import { Link, useParams } from 'react-router-dom';
import { formatUnits } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { toast } from '@/hooks/use-toast';
import { 
  useLockerOwner,
  useLockerLPToken,
  useLockerFeeReceiver,
  useLockerBalance,
} from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { formatTokenAmount } from '@/lib/web3/utils';
import { Lock, Shield, Clock, CheckCircle2, Share2, ExternalLink, ArrowRight, Link2, MessageSquare, AlertTriangle, CircleDashed } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLockStatuses, type LockState } from '@/hooks/web3/useLockStatuses';
import { cn } from '@/lib/utils';
import { buildShareText, xShareUrl } from '@/lib/share';
import { useTokenKind } from '@/hooks/web3/useTokenKind';

// X's logo (lucide only ships the old bird / a generic "x")
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
import { AppHeader } from '@/components/layout/AppHeader';

export default function LockedShowcase() {
  const { lockerAddress } = useParams();
  const validAddress = lockerAddress as `0x${string}`;

  const { data: owner } = useLockerOwner(validAddress);
  const { data: lpToken } = useLockerLPToken(validAddress);
  const { data: feeReceiver } = useLockerFeeReceiver(validAddress);
  const { data: lockedBalance } = useLockerBalance(validAddress);
  const { data: lockStates, isLoading: isLoadingLocks } = useLockStatuses(validAddress);
  const { data: tokenMetadata } = useTokenMetadata(lpToken);
  const { data: lockKind } = useTokenKind(lpToken);
  const isTokenLock = lockKind === 'token';
  const what = isTokenLock ? 'tokens' : 'liquidity';

  if (!lockerAddress) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xs text-muted-foreground">invalid locker address</p>
      </div>
    );
  }

  const liveLocks = (lockStates ?? []).filter((l) => l.status !== 'withdrawn');
  const pending = liveLocks.filter((l) => l.status === 'triggered');
  const withdrawable = liveLocks.filter((l) => l.status === 'unlocked');
  const nextUnlock = pending
    .map((l) => l.unlocksAt!)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const overall: 'loading' | 'none' | 'withdrawable' | 'pending' | 'locked' = isLoadingLocks
    ? 'loading'
    : liveLocks.length === 0
      ? 'none'
      : withdrawable.length > 0
        ? 'withdrawable'
        : pending.length > 0
          ? 'pending'
          : 'locked';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ description: '🎉 share link copied to clipboard!' });
  };

  const shareText = buildShareText({
    status: overall === 'loading' ? 'none' : overall === 'withdrawable' ? 'withdrawable' : overall,
    lpSymbol: tokenMetadata?.symbol,
    kind: lockKind ?? 'lp',
    amount: lockedBalance !== undefined && tokenMetadata ? formatTokenAmount(lockedBalance, tokenMetadata.decimals) : undefined,
    unlocksAt: nextUnlock,
  });

  const handleShareOnX = () => {
    window.open(xShareUrl(shareText, window.location.href), '_blank', 'noopener,noreferrer');
  };

  const handleCopyForSocials = () => {
    navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    toast({ description: 'post text copied - paste it into telegram, discord or x' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        showWallet={false}
        cta={
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/deploy">deploy your locker</Link>
          </Button>
        }
      />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-grid mask-fade-b pointer-events-none" aria-hidden />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="space-y-6 sm:space-y-8">
          {/* Status badge: reflects on-chain lock state, not just that a locker exists */}
          <div className="flex justify-center">
            <StatusBadge overall={overall} nextUnlock={nextUnlock} what={what} />
          </div>

          {/* Main Lock Amount */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-foreground text-background mb-2">
              <Lock className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            
            <h1 className="font-mono tabular text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight break-words">
              {lockedBalance !== undefined && tokenMetadata
                ? formatTokenAmount(lockedBalance, tokenMetadata.decimals)
                : '...'} {tokenMetadata?.symbol || 'LP'}
            </h1>
            
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              held in an aerolock locker contract on base. any withdrawal must be announced on-chain 30 days in advance.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-border">
                  <Shield className="w-5 h-5 " />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">source code</p>
                  <p className="text-sm font-semibold">verified on basescan</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    open source, not upgradeable
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-border">
                  <Lock className="w-5 h-5 " />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">active locks</p>
                  <p className="text-sm font-semibold">{isLoadingLocks ? '...' : `${liveLocks.length} lock${liveLocks.length !== 1 ? 's' : ''}`}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    read live from base
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-border">
                  <Clock className="w-5 h-5 " />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">exit rule</p>
                  <p className="text-sm font-semibold">30-day public notice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    withdrawals are visible on-chain before they can happen
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Per-lock status */}
          {liveLocks.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">locks</h2>
              <div className="divide-y divide-border">
                {liveLocks.map((lock) => (
                  <LockRow
                    key={lock.lockId}
                    lock={lock}
                    amount={tokenMetadata ? formatTokenAmount(lock.amount, tokenMetadata.decimals) : '...'}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Share Section */}
          <Card className="p-6 sm:p-8">
            <div className="text-center space-y-4">
              <Share2 className="w-6 h-6 mx-auto" />
              <h2 className="text-lg font-semibold">share this proof with your community</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                build trust by showing verifiable on-chain proof of locked {what}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleShareOnX}
                  disabled={overall === 'loading'}
                  className="w-full sm:w-auto text-sm"
                >
                  <XLogo className="h-4 w-4" /> share on X
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCopyForSocials}
                  disabled={overall === 'loading'}
                  className="w-full sm:w-auto text-sm"
                >
                  <MessageSquare className="h-4 w-4" /> copy post text
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto text-sm"
                >
                  <Link2 className="h-4 w-4" /> copy link
                </Button>
              </div>
              {overall !== 'loading' && (
                <p className="mx-auto max-w-md whitespace-pre-line border border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
                  {shareText}
                </p>
              )}
            </div>
          </Card>

          {/* Verified Contract Section */}
          <Card className="p-5 sm:p-6 border-success/30">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 " />
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 tracking-wide uppercase">
                  verified contract
                </h3>
              </div>
              
              <div className="font-mono text-xs tracking-tight text-foreground/80 break-all">
                {validAddress}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://basescan.org/address/${validAddress}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    view on basescan
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* Contract Details */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">contract details</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {lpToken && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">lp token</p>
                  <AddressDisplay address={lpToken} />
                </div>
              )}
              {owner && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">owner</p>
                  <AddressDisplay address={owner} showLink={false} />
                </div>
              )}
              {feeReceiver && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">fee receiver</p>
                  <AddressDisplay address={feeReceiver} showLink={false} />
                </div>
              )}
            </div>
          </Card>

          {/* CTA Footer */}
          <div className="text-center pt-8 space-y-4">
            <p className="text-xs text-muted-foreground">
              want to lock your own liquidity or tokens?
            </p>
            <Link to="/deploy">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                deploy your locker
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      </div>

      {/* Watermark */}
      <div className="text-center pb-safe pt-4">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          powered by aerolock
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({
  overall,
  nextUnlock,
  what,
}: {
  what: 'tokens' | 'liquidity';
  overall: 'loading' | 'none' | 'withdrawable' | 'pending' | 'locked';
  nextUnlock?: Date;
}) {
  const styles = {
    loading: { cls: 'border-border bg-muted/40 text-muted-foreground', icon: CircleDashed, text: 'reading lock status...' },
    none: { cls: 'border-border bg-muted/40 text-muted-foreground', icon: CircleDashed, text: 'no active locks' },
    withdrawable: { cls: 'border-destructive/50 bg-destructive/10 text-destructive', icon: AlertTriangle, text: `withdrawal unlocked - ${what} can be removed` },
    pending: {
      cls: 'border-warning/50 bg-warning/10 text-warning',
      icon: AlertTriangle,
      text: `withdrawal pending - unlocks ${nextUnlock ? format(nextUnlock, 'MMM d, yyyy') : 'soon'}`,
    },
    locked: { cls: 'border-success/40 bg-success/10 text-success', icon: CheckCircle2, text: `${what} locked - no withdrawal pending` },
  }[overall];
  const Icon = styles.icon;
  return (
    <div className={cn('inline-flex items-center gap-2 border px-3 py-1.5 sm:px-4 sm:py-2', styles.cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-mono text-[10px] sm:text-xs font-medium uppercase tracking-[0.15em]">{styles.text}</span>
    </div>
  );
}

function LockRow({ lock, amount }: { lock: LockState; amount: string }) {
  const detail =
    lock.status === 'active'
      ? 'locked - no withdrawal pending'
      : lock.status === 'triggered'
        ? `withdrawal triggered - unlocks ${format(lock.unlocksAt!, 'MMM d, yyyy HH:mm')} (${formatDistanceToNow(lock.unlocksAt!, { addSuffix: true })})`
        : 'withdrawal unlocked - can be removed now';
  const tone =
    lock.status === 'active' ? 'text-success' : lock.status === 'triggered' ? 'text-warning' : 'text-destructive';
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-mono tabular text-sm font-medium [overflow-wrap:anywhere]">{amount}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {lock.lockId.slice(0, 10)}...{lock.lockId.slice(-6)}
        </p>
      </div>
      <p className={cn('text-xs sm:text-right', tone)}>{detail}</p>
    </div>
  );
}
