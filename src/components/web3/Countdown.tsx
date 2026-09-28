import { useEffect, useState } from 'react';

/** Seconds from now until `to` (unix seconds), ticking every second; never below 0. */
export function useSecondsUntil(to: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (!to) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [to]);
  return to ? Math.max(0, to - now) : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2d 04h 12m 09s", dropping leading zero units. */
export function formatCountdown(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/** Big ticking countdown split into labelled units. */
export function CountdownDisplay({ seconds }: { seconds: number }) {
  const units = [
    ['days', Math.floor(seconds / 86_400)],
    ['hours', Math.floor((seconds % 86_400) / 3600)],
    ['min', Math.floor((seconds % 3600) / 60)],
    ['sec', seconds % 60],
  ] as const;
  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off" aria-label={formatCountdown(seconds)}>
      {units.map(([label, value]) => (
        <div key={label} className="border border-border bg-background px-2 py-3 text-center">
          <p className="font-mono text-2xl sm:text-4xl tabular-nums tracking-tight">{pad(value)}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
