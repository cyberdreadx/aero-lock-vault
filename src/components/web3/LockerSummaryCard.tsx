import { Link } from 'react-router-dom';
import { formatUnits } from 'viem';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { StatusPill } from '@/components/web3/StatusPill';
import { useLockerSummary } from '@/hooks/web3/useLockerSummary';
import { pairName } from '@/lib/share';

const STATUS = {
  locked: { tone: 'green', label: 'locked' },
  pending: { tone: 'amber', label: 'withdrawal pending' },
  withdrawable: { tone: 'red', label: 'unlocked' },
  empty: { tone: 'muted', label: 'empty' },
} as const;

/** A 30-day-notice locker at a glance: what's in it, how much, and whether it's safe. */
export function LockerSummaryCard({
  locker,
  token,
  deployedAt,
}: {
  locker: `0x${string}`;
  token: `0x${string}`;
  deployedAt: string | null;
}) {
  const { data: s, isLoading } = useLockerSummary(locker, token);
  const status = s ? STATUS[s.status] : null;
  const name = s ? (s.isLP ? `${pairName(s.symbol)} LP` : s.symbol) : '';

  return (
    <Link
      to={`/locker/${locker}`}
      className="group flex flex-col gap-4 border border-border bg-card p-5 hover:border-foreground/40 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s ? (s.isLP ? 'lp lock' : 'token lock') : 'locker'}</span>
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
      </div>

      <div className="min-w-0 space-y-1">
        {isLoading ? (
          <>
            <div className="h-6 w-40 bg-muted animate-pulse" />
            <div className="h-4 w-28 bg-muted/60 animate-pulse" />
          </>
        ) : (
          <>
            <p className="text-lg font-semibold tracking-tight truncate">{name || 'unknown token'}</p>
            <p className="font-mono text-sm text-muted-foreground truncate">
              {s && s.balance > 0n
                ? `${Number(formatUnits(s.balance, s.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} locked`
                : 'nothing locked yet'}
              {s?.status === 'pending' && s.unlocksAt && ` · unlocks ${format(s.unlocksAt, 'MMM d')}`}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="font-mono truncate">
          {locker.slice(0, 6)}…{locker.slice(-4)}
          {deployedAt && ` · ${formatDistanceToNow(new Date(deployedAt), { addSuffix: true })}`}
        </span>
        <span className="flex shrink-0 items-center gap-1 group-hover:text-foreground transition-colors">
          manage <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
