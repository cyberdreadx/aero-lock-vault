// Mirrors AeroVestingVault's unlock maths so the app can chart and preview schedules.

export type ScheduleKind = 'fixed' | 'cliffLinear' | 'steps';
export const KIND_INDEX: Record<ScheduleKind, number> = { fixed: 0, cliffLinear: 1, steps: 2 };
export const KIND_FROM_INDEX: ScheduleKind[] = ['fixed', 'cliffLinear', 'steps'];

export interface Schedule {
  kind: ScheduleKind;
  /** unix seconds */
  start: number;
  cliff: number;
  duration: number;
  steps: number;
}

export const DAY = 86_400;

/** Share of the lock (0..1) unlocked at `t` (unix seconds). */
export function vestedFraction(s: Schedule, t: number): number {
  if (s.kind === 'fixed') return t >= s.cliff ? 1 : 0;
  if (s.kind === 'cliffLinear') {
    if (t < s.cliff) return 0;
    return Math.min(1, (t - s.cliff) / s.duration);
  }
  if (t < s.start) return 0;
  return Math.min(1, Math.floor((t - s.start) / s.duration) / s.steps);
}

/** Exact on-chain amount unlocked at `t`, as the contract computes it. */
export function vestedAmount(s: Schedule, total: bigint, t: number): bigint {
  if (s.kind === 'fixed') return t >= s.cliff ? total : 0n;
  if (s.kind === 'cliffLinear') {
    if (t < s.cliff) return 0n;
    const elapsed = BigInt(t - s.cliff);
    return elapsed >= BigInt(s.duration) ? total : (total * elapsed) / BigInt(s.duration);
  }
  if (t < s.start) return 0n;
  const done = BigInt(Math.floor((t - s.start) / s.duration));
  return done >= BigInt(s.steps) ? total : (total * done) / BigInt(s.steps);
}

export function fullyUnlockedAt(s: Schedule): number {
  if (s.kind === 'fixed') return s.cliff;
  if (s.kind === 'cliffLinear') return s.cliff + s.duration;
  return s.start + s.duration * s.steps;
}

/** Corner points of the unlock curve, for drawing. */
export function curvePoints(s: Schedule): { t: number; f: number }[] {
  if (s.kind === 'fixed') return [{ t: s.start, f: 0 }, { t: s.cliff, f: 0 }, { t: s.cliff, f: 1 }];
  if (s.kind === 'cliffLinear') {
    return [{ t: s.start, f: 0 }, { t: s.cliff, f: 0 }, { t: s.cliff + s.duration, f: 1 }];
  }
  const pts = [{ t: s.start, f: 0 }];
  for (let i = 1; i <= s.steps; i++) {
    const t = s.start + i * s.duration;
    pts.push({ t, f: (i - 1) / s.steps }, { t, f: i / s.steps });
  }
  return pts;
}

export function formatDuration(seconds: number): string {
  const days = Math.round(seconds / DAY);
  if (days >= 365 && days % 365 === 0) return `${days / 365} year${days === 365 ? '' : 's'}`;
  if (days >= 30 && days % 30 === 0) return `${days / 30} month${days === 30 ? '' : 's'}`;
  if (days % 7 === 0 && days >= 7) return `${days / 7} week${days === 7 ? '' : 's'}`;
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** One-line plain-English description of a schedule. */
export function describeSchedule(s: Schedule, fmt: (t: number) => string): string {
  if (s.kind === 'fixed') return `everything unlocks on ${fmt(s.cliff)}`;
  if (s.kind === 'cliffLinear') {
    const cliff = s.cliff > s.start ? `nothing until ${fmt(s.cliff)}, then ` : '';
    return `${cliff}unlocks gradually over ${formatDuration(s.duration)}, fully by ${fmt(s.cliff + s.duration)}`;
  }
  return `${s.steps} equal part${s.steps === 1 ? '' : 's'}, one every ${formatDuration(s.duration)}, fully by ${fmt(fullyUnlockedAt(s))}`;
}

/** When the next part unlocks after `t`, or null once everything has. */
export function nextUnlockAt(s: Schedule, t: number): number | null {
  const end = fullyUnlockedAt(s);
  if (t >= end) return null;
  if (s.kind === 'fixed') return s.cliff;
  if (s.kind === 'cliffLinear') return t < s.cliff ? s.cliff : t;
  return s.start + (Math.floor((t - s.start) / s.duration) + 1) * s.duration;
}
