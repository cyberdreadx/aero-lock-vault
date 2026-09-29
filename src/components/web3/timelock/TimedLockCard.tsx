import { Link } from 'react-router-dom';
import { formatUnits } from 'viem';
import { ArrowRight } from 'lucide-react';
import { StatusPill } from '@/components/web3/StatusPill';
import { formatCountdown, useSecondsUntil } from '@/components/web3/Countdown';
import { useVault } from '@/hooks/web3/useTimelock';
import { fullyUnlockedAt, nextUnlockAt } from '@/lib/web3/timelock/schedule';
import { pairLabel } from '@/lib/web3/timelock/display';

const KIND_LABEL = { fixed: 'timed lock', cliffLinear: 'vesting · cliff + linear', steps: 'vesting · steps' } as const;

/** A timed or vesting lock at a glance, with a live countdown to its next unlock. */
export function TimedLockCard({ vault }: { vault: `0x${string}` }) {
  const { data: v, isLoading } = useVault(vault);
  const now = Math.floor(Date.now() / 1000);
  const next = v ? nextUnlockAt(v.schedule, now) : null;
  const secondsLeft = useSecondsUntil(next && next > now ? next : null);
  const done = v ? fullyUnlockedAt(v.schedule) <= now : false;
  const unlockedPct = v && v.total > 0n ? Number(((v.total - v.stillLocked) * 1000n) / v.total) / 10 : 0;

  return (
    <Link
      to={`/vault/${vault}`}
      className="group flex flex-col gap-4 border border-border bg-card p-5 hover:border-foreground/40 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{v ? KIND_LABEL[v.schedule.kind] : 'timed lock'}</span>
        {v &&
          (v.releasable > 0n ? (
            <StatusPill tone="red">ready to withdraw</StatusPill>
          ) : done && v.stillLocked === 0n && v.released === v.total ? (
            <StatusPill tone="muted">withdrawn</StatusPill>
          ) : (
            <StatusPill tone="green">{unlockedPct > 0 ? `${unlockedPct}% unlocked` : 'locked'}</StatusPill>
          ))}
      </div>

      <div className="min-w-0 space-y-1">
        {isLoading || !v ? (
          <>
            <div className="h-6 w-40 bg-muted animate-pulse" />
            <div className="h-4 w-28 bg-muted/60 animate-pulse" />
          </>
        ) : (
          <>
            <p className="text-lg font-semibold tracking-tight truncate">{pairLabel(v.symbol, v.isLP)}</p>
            <p className="font-mono text-sm text-muted-foreground truncate">
              {Number(formatUnits(v.total, v.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} total
              {secondsLeft ? ` · ${v.schedule.kind === 'fixed' ? 'unlocks' : 'next'} in ${formatCountdown(secondsLeft)}` : ''}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="font-mono truncate">
          {vault.slice(0, 6)}…{vault.slice(-4)}
        </span>
        <span className="flex shrink-0 items-center gap-1 group-hover:text-foreground transition-colors">
          open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
