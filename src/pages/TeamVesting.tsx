import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useQueries } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { format } from 'date-fns';
import { ArrowRight, BadgeCheck, Copy, Share2, ShieldAlert, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeading } from '@/components/layout/PageHeading';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { formatCountdown, useSecondsUntil } from '@/components/web3/Countdown';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { readVault, useTeamBatch, type VaultInfo } from '@/hooks/web3/useTimelock';
import { describeSchedule, fullyUnlockedAt, nextUnlockAt } from '@/lib/web3/timelock/schedule';
import { pairLabel } from '@/lib/web3/timelock/display';
import { buildTeamShareText, xShareUrl } from '@/lib/share';
import { withReferral } from '@/lib/referral';

const fmtDate = (t: number) => format(t * 1000, 'MMM d, yyyy h:mm a');
const fmtAmount = (wei: bigint, decimals: number) =>
  Number(formatUnits(wei, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });

export default function TeamVesting() {
  const { batchId } = useParams();
  const id = batchId !== undefined && /^\d+$/.test(batchId) ? Number(batchId) : undefined;
  const { data: team, isLoading } = useTeamBatch(id);
  const vaultQueries = useQueries({
    queries: (team?.vaults ?? []).map((address) => ({
      queryKey: ['timelock-vault', address.toLowerCase()],
      queryFn: () => readVault(address),
      refetchInterval: 30_000,
    })),
  });
  const vaults = vaultQueries.map((q) => q.data).filter((v): v is VaultInfo => !!v);
  const loadingVaults = vaultQueries.some((q) => q.isLoading);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {id === undefined ? (
            <p className="text-xs text-muted-foreground">invalid team link</p>
          ) : isLoading ? (
            <div className="h-64 border border-border bg-muted/30 animate-pulse" />
          ) : !team ? (
            <p className="text-xs text-muted-foreground">no aerolock team vesting with this id</p>
          ) : (
            <Team label={team.label} createdAt={team.createdAt} creator={team.creator} vaults={vaults} expected={team.vaults.length} loading={loadingVaults} />
          )}
        </div>
      </main>
    </div>
  );
}

function Team({
  label,
  createdAt,
  creator,
  vaults,
  expected,
  loading,
}: {
  label: string;
  createdAt: number;
  creator: `0x${string}`;
  vaults: VaultInfo[];
  expected: number;
  loading: boolean;
}) {
  const { address } = useAccount();
  const first = vaults[0];
  const total = vaults.reduce((t, v) => t + v.total, 0n);
  const stillLocked = vaults.reduce((t, v) => t + v.stillLocked, 0n);
  const until = vaults.length ? Math.max(...vaults.map((v) => fullyUnlockedAt(v.schedule))) : createdAt;
  const allGenuine = vaults.length === expected && vaults.every((v) => v.genuine);
  const lockedPct = total > 0n ? Number((stillLocked * 1000n) / total) / 10 : 0;
  const name = first ? pairLabel(first.symbol, first.isLP) : '';

  const shareUrl = withReferral(window.location.href, address);
  const shareText = first
    ? buildTeamShareText({
        label,
        symbol: first.symbol,
        isLP: first.isLP,
        wallets: expected,
        total: fmtAmount(total, first.decimals),
        until: new Date(until * 1000),
      })
    : '';

  return (
    <>
      <PageHeading
        eyebrow="team vesting"
        title={label || 'team vesting'}
        description={
          first ? `${fmtAmount(total, first.decimals)} ${name} across ${expected} wallet${expected === 1 ? '' : 's'} · created ${format(createdAt * 1000, 'MMM d, yyyy')}` : '…'
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ description: 'link copied' });
              }}
            >
              <Copy className="h-3.5 w-3.5" /> copy link
            </Button>
            <Button size="sm" className="text-xs" disabled={!first} onClick={() => window.open(xShareUrl(shareText, shareUrl), '_blank', 'noopener,noreferrer')}>
              <Share2 className="h-3.5 w-3.5" /> share on x
            </Button>
          </>
        }
      />

      {!loading &&
        (allGenuine ? (
          <p className="flex items-center gap-2 text-xs text-green-500">
            <BadgeCheck className="h-4 w-4" /> every wallet is a genuine aerolock vault - tokens can only leave on each schedule
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-red-500">
            <ShieldAlert className="h-4 w-4" /> some of these locks could not be confirmed as aerolock vaults
          </p>
        ))}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['wallets', String(expected)],
          ['still locked', first ? `${lockedPct}%` : '…'],
          ['locked amount', first ? fmtAmount(stillLocked, first.decimals) : '…'],
          ['fully vested', vaults.length ? format(until * 1000, 'MMM d, yyyy') : '…'],
        ].map(([k, v]) => (
          <div key={k} className="border border-border bg-card p-4 space-y-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
            <p className="font-mono text-base sm:text-lg truncate">{v}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Users className="h-4 w-4" /> allocations
        </h2>
        {loading && vaults.length === 0 ? (
          <div className="h-40 border border-border bg-muted/30 animate-pulse" />
        ) : (
          <ul className="divide-y divide-border border border-border">
            {vaults.map((v) => (
              <MemberRow key={v.address} v={v} total={total} />
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        created by <AddressDisplay address={creator} /> · each wallet withdraws its own unlocked tokens; the creator cannot take them back.
      </p>
    </>
  );
}

function MemberRow({ v, total }: { v: VaultInfo; total: bigint }) {
  const now = Math.floor(Date.now() / 1000);
  const next = nextUnlockAt(v.schedule, now);
  const secondsLeft = useSecondsUntil(next && next > now ? next : null);
  const share = total > 0n ? Number((v.total * 1000n) / total) / 10 : 0;
  const unlockedPct = v.total > 0n ? Number(((v.total - v.stillLocked) * 1000n) / v.total) / 10 : 0;

  return (
    <li>
      <Link to={`/vault/${v.address}`} className="flex flex-col gap-2 px-4 py-3 text-xs hover:bg-muted transition-colors sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2">
            <span className="font-mono">{v.owner.slice(0, 6)}…{v.owner.slice(-4)}</span>
            <span className="font-medium">
              {fmtAmount(v.total, v.decimals)} {v.symbol}
            </span>
            <span className="text-muted-foreground">({share}%)</span>
          </p>
          <p className="text-muted-foreground truncate">{describeSchedule(v.schedule, fmtDate)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="w-28 space-y-1">
            <div className="h-1.5 w-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${unlockedPct}%` }} />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">{unlockedPct}% unlocked</p>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground w-40 text-right whitespace-nowrap">
            {secondsLeft ? `next in ${formatCountdown(secondsLeft)}` : fullyUnlockedAt(v.schedule) <= now ? 'fully unlocked' : ''}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
