import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useDeployedLockers } from '@/hooks/useDeployedLockers';
import { useCheckLockerOwnership } from '@/hooks/useCheckLockerOwnership';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
import { LockerSummaryCard } from '@/components/web3/LockerSummaryCard';
import { TimedLockCard } from '@/components/web3/timelock/TimedLockCard';
import { useTeamBatchesOf, useTimelockVaults } from '@/hooks/web3/useTimelock';
import { Plus, RefreshCw, Vault } from 'lucide-react';

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
                <LockerSummaryCard
                  key={locker.id}
                  locker={locker.locker_address as `0x${string}`}
                  token={locker.lp_token_address as `0x${string}`}
                  deployedAt={locker.deployed_at}
                />
              ))}
            </div>
          )}

          <TimedLocksSection wallet={address} />
        </div>
      </main>
    </div>
  );
}

/** Timed, vesting and team locks this wallet owns or created. */
function TimedLocksSection({ wallet }: { wallet?: `0x${string}` }) {
  const { data: vaults, isLoading } = useTimelockVaults(wallet);
  const { data: teams } = useTeamBatchesOf(wallet);
  if (isLoading || (!vaults?.length && !teams?.length)) return null;
  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">timed &amp; vesting locks</h2>
        <Link to="/timelock" className="text-xs text-muted-foreground hover:text-foreground">
          new timed lock →
        </Link>
      </div>
      {!!teams?.length && (
        <div className="flex flex-wrap gap-2">
          {teams.map((id) => (
            <Link key={id} to={`/team/${id}`} className="border border-border px-3 py-1.5 text-xs hover:border-foreground/40 transition-colors">
              team vesting #{id} →
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(vaults ?? []).map((v) => (
          <TimedLockCard key={v} vault={v} />
        ))}
      </div>
    </section>
  );
}
