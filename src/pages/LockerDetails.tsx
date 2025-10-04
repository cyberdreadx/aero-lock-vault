import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { toast } from '@/hooks/use-toast';

export default function LockerDetails() {
  const { lockerAddress } = useParams();
  const { address, isConnected } = useAccount();

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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Locker Header */}
          <div className="space-y-4">
            <Link to="/lockers" className="text-xs text-muted-foreground hover:text-foreground">
              ← back to lockers
            </Link>
            
            <div className="border border-border p-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-xs text-muted-foreground mb-2">locker contract</h1>
                  <AddressDisplay address={lockerAddress as `0x${string}`} />
                </div>
                
                <div className="flex gap-3">
                  <Button size="sm" disabled>
                    create lock
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    claim all fees
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Note */}
          <div className="border border-amber-500/20 bg-amber-500/10 p-6">
            <h2 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-3">
              🚧 Implementation Required
            </h2>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 space-y-2 leading-relaxed">
              <p>This page needs to be fully implemented with:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Fetch all locks from this specific locker contract</li>
                <li>Display lock list with details (amount, status, unlock time)</li>
                <li>Create new locks in this locker</li>
                <li>Manage individual locks (trigger withdrawal, cancel, claim fees, withdraw)</li>
                <li>Top up existing locks</li>
              </ul>
              <p className="mt-3">
                <strong>Key difference from shared locker:</strong> All hook calls need to pass the 
                lockerAddress parameter instead of using a hardcoded constant.
              </p>
            </div>
          </div>

          {/* Placeholder for locks list */}
          <div className="border border-border p-8 text-center">
            <p className="text-xs text-muted-foreground mb-4">
              No locks created in this locker yet
            </p>
            <Button size="sm" variant="outline" disabled>
              create first lock
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
