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
import { Lock, Shield, Clock, CheckCircle2, Share2, ExternalLink } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background text-foreground">
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="text-xs tracking-tight font-medium">
          aerolock
        </Link>
        <Link to="/deploy">
          <Button variant="outline" size="sm">
            deploy your locker
          </Button>
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          {/* Hero Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 border-2 border-green-500/40 rounded-full shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400 tracking-wide">
                LIQUIDITY LOCKED & VERIFIED
              </span>
            </div>
          </div>

          {/* Main Lock Amount */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 mb-4">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              {lockedBalance !== undefined && tokenMetadata
                ? formatTokenAmount(lockedBalance, tokenMetadata.decimals)
                : '...'} {tokenMetadata?.symbol || 'LP'}
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Locked in a secure smart contract on Base Network via AeroLock
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">security</p>
                  <p className="text-sm font-semibold">audited contract</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    time-locked withdrawals
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Lock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">active locks</p>
                  <p className="text-sm font-semibold">{lockIds?.length || 0} lock{lockIds?.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    on-chain verified
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">timelock</p>
                  <p className="text-sm font-semibold">30-day emergency delay</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    extra protection
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Share Section */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
            <div className="text-center space-y-4">
              <Share2 className="w-8 h-8 text-primary mx-auto" />
              <h2 className="text-lg font-semibold">share this proof with your community</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                build trust by showing verifiable on-chain proof of locked liquidity
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button 
                  size="lg" 
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto"
                >
                  📋 copy share link
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleCopyForSocials}
                  className="w-full sm:w-auto"
                >
                  💬 copy for twitter/discord
                </Button>
              </div>
            </div>
          </Card>

          {/* Contract Details */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">contract details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">locker contract</p>
                <AddressDisplay address={validAddress} />
              </div>
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
              <Button size="lg" className="gap-2">
                deploy your locker
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="text-center pb-8">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          powered by aerolock
        </Link>
      </div>
    </div>
  );
}
