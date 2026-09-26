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
  useGetAllLockIds,
} from '@/hooks/web3/useLPLocker';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { formatTokenAmount } from '@/lib/web3/utils';
import { Lock, Shield, Clock, CheckCircle2, Share2, ExternalLink, ArrowRight, Link2, MessageSquare } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';

export default function LockedShowcase() {
  const { lockerAddress } = useParams();
  const validAddress = lockerAddress as `0x${string}`;

  const { data: owner } = useLockerOwner(validAddress);
  const { data: lpToken } = useLockerLPToken(validAddress);
  const { data: feeReceiver } = useLockerFeeReceiver(validAddress);
  const { data: lockedBalance } = useLockerBalance(validAddress);
  const { data: lockIds } = useGetAllLockIds(validAddress);
  const { data: tokenMetadata } = useTokenMetadata(lpToken);

  if (!lockerAddress) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xs text-muted-foreground">invalid locker address</p>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ description: '🎉 share link copied to clipboard!' });
  };

  const handleCopyForSocials = () => {
    const text = `🔒 Liquidity Locked on AeroLock!\n\n${lockedBalance !== undefined && tokenMetadata ? formatTokenAmount(lockedBalance, tokenMetadata.decimals) : ''} ${tokenMetadata?.symbol || 'LP'} tokens secured\n\nVerified on Base: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    toast({ description: '💬 social media message copied!' });
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
          {/* Hero Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-success/10 border border-success/40">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="font-mono text-[10px] sm:text-xs font-medium text-success tracking-[0.15em]">
                LIQUIDITY LOCKED & VERIFIED
              </span>
            </div>
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
              Locked in a secure smart contract on Base Network via AeroLock
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
                  <p className="text-xs text-muted-foreground mb-1">security</p>
                  <p className="text-sm font-semibold">audited contract</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    time-locked withdrawals
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
                  <p className="text-sm font-semibold">{lockIds?.length || 0} lock{lockIds?.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    on-chain verified
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
                  <p className="text-xs text-muted-foreground mb-1">timelock</p>
                  <p className="text-sm font-semibold">30-day emergency delay</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    extra protection
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Share Section */}
          <Card className="p-6 sm:p-8">
            <div className="text-center space-y-4">
              <Share2 className="w-6 h-6 mx-auto" />
              <h2 className="text-lg font-semibold">share this proof with your community</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                build trust by showing verifiable on-chain proof of locked liquidity
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button 
                  size="lg" 
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto text-sm"
                >
                  <Link2 className="h-4 w-4" /> copy share link
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleCopyForSocials}
                  className="w-full sm:w-auto text-sm"
                >
                  <MessageSquare className="h-4 w-4" /> copy for x / discord
                </Button>
              </div>
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
                <a
                  href="https://github.com/your-repo/audit-report"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    audit report
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
              want to lock your own liquidity?
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
