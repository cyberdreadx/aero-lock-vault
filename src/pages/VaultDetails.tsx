import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, formatUnits, isAddress } from 'viem';
import { format } from 'date-fns';
import { BadgeCheck, Copy, ExternalLink, Share2, ShieldAlert } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeading } from '@/components/layout/PageHeading';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { VestingChart } from '@/components/web3/VestingChart';
import { CountdownDisplay, useSecondsUntil } from '@/components/web3/Countdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useVault, type VaultInfo } from '@/hooks/web3/useTimelock';
import { useBaseTx } from '@/hooks/web3/useBaseTx';
import { BASE_SCAN_URL } from '@/lib/web3/constants';
import { txErrorMessage } from '@/lib/web3/txError';
import { TIMELOCK_VAULT_ABI } from '@/lib/web3/timelock/artifacts';
import { describeSchedule, fullyUnlockedAt, nextUnlockAt, pairLabel } from '@/lib/web3/timelock/display';
import { buildTimedShareText, xShareUrl } from '@/lib/share';
import { withReferral } from '@/lib/referral';

const fmtDate = (t: number) => format(t * 1000, 'MMM d, yyyy');

export default function VaultDetails() {
  const { vaultAddress } = useParams();
  const valid = vaultAddress && isAddress(vaultAddress, { strict: false }) ? (vaultAddress as `0x${string}`) : undefined;
  const { data: v, isLoading } = useVault(valid);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {!valid ? (
            <p className="text-xs text-muted-foreground">invalid lock address</p>
          ) : isLoading ? (
            <div className="h-64 border border-border bg-muted/30 animate-pulse" />
          ) : !v ? (
            <p className="text-xs text-muted-foreground">no aerolock timed lock at this address</p>
          ) : (
            <Vault v={v} />
          )}
        </div>
      </main>
    </div>
  );
}

function amt(v: VaultInfo, wei: bigint) {
  return Number(formatUnits(wei, v.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Vault({ v }: { v: VaultInfo }) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();
  const [newDate, setNewDate] = useState('');
  const [newOwner, setNewOwner] = useState('');

  const now = Math.floor(Date.now() / 1000);
  const end = fullyUnlockedAt(v.schedule);
  const unlocked = v.total - v.stillLocked;
  const unlockedPct = v.total > 0n ? Number((unlocked * 1000n) / v.total) / 10 : 0;
  const isOwner = !!address && address.toLowerCase() === v.owner.toLowerCase();
  const isPending = !!address && address.toLowerCase() === v.pendingOwner.toLowerCase();
  const name = pairLabel(v.symbol, v.isLP);
  const next = nextUnlockAt(v.schedule, now);
  // linear vesting unlocks continuously once started, so count down to the end instead
  const target = v.schedule.kind === 'cliffLinear' && next === now ? end : next;
  const secondsLeft = useSecondsUntil(target);

  // refresh the on-chain numbers the moment something unlocks
  useEffect(() => {
    if (secondsLeft === 0) queryClient.invalidateQueries({ queryKey: ['timelock-vault'] });
  }, [secondsLeft, queryClient]);

  const call = async (label: string, functionName: string, args: unknown[] = [], done = 'done') => {
    try {
      await send(label, {
        to: v.address,
        data: encodeFunctionData({ abi: TIMELOCK_VAULT_ABI, functionName, args } as never),
      });
      toast({ description: done });
      queryClient.invalidateQueries({ queryKey: ['timelock-vault'] });
    } catch (e) {
      toast({ description: txErrorMessage(e, `${label} failed`), variant: 'destructive' });
    }
  };

  const shareUrl = withReferral(window.location.href, address);
  const shareText = buildTimedShareText({
    symbol: v.symbol,
    isLP: v.isLP,
    amount: amt(v, v.total),
    kind: v.schedule.kind,
    fullyUnlockedAt: new Date(end * 1000),
    unlockedPercent: unlockedPct,
  });

  return (
    <>
      <PageHeading
        eyebrow={v.schedule.kind === 'fixed' ? 'timed lock' : 'vesting lock'}
        title={`${amt(v, v.total)} ${name}`}
        description={describeSchedule(v.schedule, fmtDate)}
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
            <Button size="sm" className="text-xs" onClick={() => window.open(xShareUrl(shareText, shareUrl), '_blank', 'noopener,noreferrer')}>
              <Share2 className="h-3.5 w-3.5" /> share on x
            </Button>
          </>
        }
      />

      {v.genuine ? (
        <p className="flex items-center gap-2 text-xs text-green-500">
          <BadgeCheck className="h-4 w-4" /> genuine aerolock vault - funds can only leave on this schedule
        </p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-red-500">
          <ShieldAlert className="h-4 w-4" /> this contract was not created by aerolock - don't trust it
        </p>
      )}

      <section className="border border-border bg-card p-4 space-y-3">
        {secondsLeft !== null && secondsLeft > 0 ? (
          <>
            <p className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium">
                {v.schedule.kind === 'fixed'
                  ? 'unlocks in'
                  : target === end
                    ? 'fully unlocked in'
                    : v.schedule.kind === 'cliffLinear'
                      ? 'cliff ends in'
                      : 'next part unlocks in'}
              </span>
              <span className="font-mono text-muted-foreground">{format(target! * 1000, 'MMM d, yyyy h:mm a')}</span>
            </p>
            <CountdownDisplay seconds={secondsLeft} />
          </>
        ) : (
          <p className="text-center text-sm font-medium py-2">
            {v.stillLocked === 0n && v.releasable === 0n && v.released === v.total ? 'fully unlocked and withdrawn' : 'unlocked 🔓'}
            {v.releasable > 0n && <span className="block text-xs font-normal text-muted-foreground">{amt(v, v.releasable)} {v.symbol} ready to withdraw</span>}
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['still locked', v.stillLocked],
          ['unlocked', unlocked],
          ['withdrawn', v.released],
          ['ready now', v.releasable],
        ].map(([label, wei]) => (
          <div key={label as string} className="border border-border bg-card p-4 space-y-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label as string}</p>
            <p className="font-mono text-base sm:text-lg truncate">{amt(v, wei as bigint)}</p>
          </div>
        ))}
      </div>

      <section className="border border-border bg-card p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">unlock schedule</span>
          <span className="text-muted-foreground">{end <= now ? 'fully unlocked' : `${unlockedPct}% unlocked · done ${fmtDate(end)}`}</span>
        </div>
        <VestingChart schedule={v.schedule} total={v.total} decimals={v.decimals} symbol={v.symbol} now={now} />
      </section>

      {(isOwner || isPending || v.isLP) && (
        <section className="border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold tracking-tight">actions</h2>

          {isOwner && (
            <Button className="w-full text-xs" disabled={!!busy || v.releasable === 0n} onClick={() => call('withdrawing', 'release', [], 'withdrawn to your wallet')}>
              {busy === 'withdrawing'
                ? 'withdrawing...'
                : v.releasable > 0n
                  ? `withdraw ${amt(v, v.releasable)} ${v.symbol}`
                  : nextUnlockAt(v.schedule, now)
                    ? `next unlock ${fmtDate(nextUnlockAt(v.schedule, now)!)}`
                    : 'all withdrawn'}
            </Button>
          )}

          {v.isLP && (
            <div className="space-y-1.5">
              <Button variant="outline" className="w-full text-xs" disabled={!!busy} onClick={() => call('claiming', 'claimFees', [], 'aerodrome fees sent to the fee receiver')}>
                {busy === 'claiming' ? 'claiming...' : 'claim aerodrome trading fees'}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                anyone can press this - fees only ever go to <span className="font-mono">{v.feeReceiver.slice(0, 6)}…{v.feeReceiver.slice(-4)}</span>. the lp stays locked.
              </p>
            </div>
          )}

          {isOwner && v.schedule.kind === 'fixed' && end > now && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">extend the lock - pushes the unlock date later (never earlier)</p>
              <div className="flex gap-2">
                <Input type="date" value={newDate} min={format((end + 86_400) * 1000, 'yyyy-MM-dd')} onChange={(e) => setNewDate(e.target.value)} className="text-base sm:text-sm" />
                <Button
                  variant="outline"
                  className="text-xs h-10"
                  disabled={!newDate || !!busy}
                  onClick={() => {
                    const t = Math.floor(new Date(`${newDate}T00:00`).getTime() / 1000);
                    if (t <= end) return toast({ description: 'pick a date after the current unlock', variant: 'destructive' });
                    call('extending', 'extendUnlock', [BigInt(t)], `extended to ${fmtDate(t)}`);
                  }}
                >
                  {busy === 'extending' ? 'extending...' : 'extend'}
                </Button>
              </div>
            </div>
          )}

          {isOwner && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">hand this lock to another wallet</summary>
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] text-muted-foreground">the new wallet has to accept before anything changes.</p>
                <div className="flex gap-2">
                  <Input placeholder="new owner 0x…" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="font-mono text-base sm:text-xs" />
                  <Button
                    variant="outline"
                    className="text-xs h-10"
                    disabled={!isAddress(newOwner.trim(), { strict: false }) || !!busy}
                    onClick={() => call('transferring', 'transferOwnership', [newOwner.trim()], 'transfer started - the new wallet must accept')}
                  >
                    send
                  </Button>
                </div>
              </div>
            </details>
          )}

          {isPending && (
            <Button className="w-full text-xs" disabled={!!busy} onClick={() => call('accepting', 'acceptOwnership', [], 'you now own this lock')}>
              {busy === 'accepting' ? 'accepting...' : 'accept ownership of this lock'}
            </Button>
          )}
        </section>
      )}

      <section className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
        {[
          ['owner', v.owner],
          [v.isLP ? 'lp' : 'token', v.token],
          ...(v.isLP ? [['fee receiver', v.feeReceiver]] : []),
          ['lock contract', v.address],
        ].map(([label, addr]) => (
          <div key={label} className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <span className="text-muted-foreground">{label}</span>
            <AddressDisplay address={addr} />
          </div>
        ))}
        <a
          href={`${BASE_SCAN_URL}/address/${v.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          view on basescan <ExternalLink className="h-3 w-3" />
        </a>
        <Link to="/timelock" className="sm:text-right text-muted-foreground hover:text-foreground">
          aerolock timed locks →
        </Link>
      </section>
    </>
  );
}
