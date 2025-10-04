import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/web3/WalletButton';
import { useDeployedLockers } from '@/hooks/useDeployedLockers';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: lockers, isLoading } = useDeployedLockers();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-sm tracking-tight">connect wallet to view locks</h1>
          <WalletButton />
        </div>
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
          <Link to="/deploy">
            <Button variant="outline" size="sm">
              deploy locker
            </Button>
          </Link>
          <WalletButton />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-sm tracking-tight mb-1">your deployed lockers</h1>
            <p className="text-xs text-muted-foreground">{address && <AddressDisplay address={address} />}</p>
          </div>

          {isLoading && (
            <div className="text-xs text-muted-foreground">loading lockers...</div>
          )}

          {!isLoading && (!lockers || lockers.length === 0) && (
            <div className="border border-border p-8 text-center space-y-4">
              <p className="text-xs text-muted-foreground">no lockers deployed yet</p>
              <Link to="/deploy">
                <Button variant="outline" size="sm">
                  deploy first locker
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && lockers && lockers.length > 0 && (
            <div className="grid gap-4">
              {lockers.map((locker) => (
                <Link
                  key={locker.id}
                  to={`/locker/${locker.locker_address}`}
                  className="border border-border p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium">locker contract</p>
                        <AddressDisplay address={locker.locker_address as `0x${string}`} />
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        manage →
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">lp token</p>
                        <AddressDisplay 
                          address={locker.lp_token_address as `0x${string}`} 
                          showLink={false}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">deployed</p>
                        <p className="text-xs">
                          {locker.deployed_at 
                            ? formatDistanceToNow(new Date(locker.deployed_at), { addSuffix: true })
                            : 'unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
