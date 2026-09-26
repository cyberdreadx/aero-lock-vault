import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useDeployedLockers } from '@/hooks/useDeployedLockers';
import { useCheckLockerOwnership } from '@/hooks/useCheckLockerOwnership';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Plus, RefreshCw, Vault } from 'lucide-react';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: lockers, isLoading } = useDeployedLockers();
  const { mutate: checkOwnership, isPending } = useCheckLockerOwnership();

  if (!isConnected) {
    return (
      <ConnectGate
        title="connect wallet to view locks"
        description="your deployed lockers and active locks will show up here."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <PageHeading
            eyebrow="dashboard"
            title="your deployed lockers"
            description={address && <AddressDisplay address={address} />}
            actions={
              <>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => checkOwnership()} disabled={isPending}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
                  {isPending ? 'checking...' : 'check for lockers'}
                </Button>
                <Button asChild size="sm" className="text-xs">
                  <Link to="/deploy">
                    <Plus className="h-3.5 w-3.5" />
                    deploy locker
                  </Link>
                </Button>
              </>
            }
          />

          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-36 border border-border bg-muted/30 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (!lockers || lockers.length === 0) && (
            <div className="border border-dashed border-border px-6 py-14 text-center space-y-4">
              <Vault className="mx-auto h-6 w-6 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">no lockers deployed yet</p>
                <p className="text-xs text-muted-foreground">deploy a locker for your aerodrome lp token to get started</p>
              </div>
              <Button asChild size="sm" className="text-xs">
                <Link to="/deploy">deploy first locker</Link>
              </Button>
            </div>
          )}

          {!isLoading && lockers && lockers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {lockers.map((locker) => (
                <Link
                  key={locker.id}
                  to={`/locker/${locker.locker_address}`}
                  className="group border border-border bg-card p-5 hover:border-foreground/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">locker contract</p>
                        <AddressDisplay address={locker.locker_address as `0x${string}`} />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        manage
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">lp token</p>
                        <AddressDisplay address={locker.lp_token_address as `0x${string}`} showLink={false} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">deployed</p>
                        <p className="text-xs leading-8 sm:leading-6">
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
      </main>
    </div>
  );
}
