import { addDays, format } from 'date-fns';
import { CalendarClock, Hourglass, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DAY, type Schedule, type ScheduleKind } from '@/lib/web3/timelock/schedule';
import { cn } from '@/lib/utils';

/** What the schedule controls hold; turned into an on-chain schedule by resolveSchedule. */
export interface ScheduleInput {
  kind: ScheduleKind;
  unlockDate: string;
  unlockClock: string;
  cliffDays: number;
  vestDays: number;
  steps: number;
  stepDays: number;
}

const MAX_SPAN = 100 * 365 * DAY;
// a fixed unlock must be at least this far out, leaving time to sign and confirm
const MIN_LEAD = 5 * 60;

export function defaultScheduleInput(): ScheduleInput {
  return {
    kind: 'fixed',
    unlockDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    unlockClock: '12:00',
    cliffDays: 90,
    vestDays: 365,
    steps: 12,
    stepDays: 30,
  };
}

/** The schedule as the contract will store it (starting `now`), its createLock fields, and any problem. */
export function resolveSchedule(v: ScheduleInput, now: number) {
  const unlockTime = Math.floor(new Date(`${v.unlockDate}T${v.unlockClock || '00:00'}`).getTime() / 1000) || 0;
  const schedule: Schedule = {
    kind: v.kind,
    start: now,
    cliff: v.kind === 'fixed' ? unlockTime : v.kind === 'cliffLinear' ? now + v.cliffDays * DAY : 0,
    duration: v.kind === 'cliffLinear' ? v.vestDays * DAY : v.kind === 'steps' ? v.stepDays * DAY : 0,
    steps: v.kind === 'steps' ? v.steps : 0,
  };
  const problem =
    v.kind === 'fixed' && !(unlockTime >= now + MIN_LEAD && unlockTime - now <= MAX_SPAN)
      ? 'pick an unlock time at least 5 minutes from now'
      : v.kind === 'cliffLinear' && !(v.vestDays > 0 && v.cliffDays >= 0 && (v.cliffDays + v.vestDays) * DAY <= MAX_SPAN)
        ? 'unlock length must be at least a day'
        : v.kind === 'steps' && !(v.steps >= 1 && v.steps <= 1000 && v.stepDays > 0 && v.steps * v.stepDays * DAY <= MAX_SPAN)
          ? 'steps must be between 1 and 1000'
          : null;
  const params = {
    unlockTime: BigInt(v.kind === 'fixed' ? unlockTime : 0),
    cliffDuration: BigInt(v.kind === 'cliffLinear' ? v.cliffDays * DAY : 0),
    duration: BigInt(schedule.duration),
    steps: v.kind === 'steps' ? v.steps : 0,
  };
  return { schedule, problem, params, unlockTime };
}

const KINDS: { kind: ScheduleKind; label: string; hint: string; icon: typeof CalendarClock }[] = [
  { kind: 'fixed', label: 'fixed date', hint: 'all unlocks on one day', icon: CalendarClock },
  { kind: 'cliffLinear', label: 'cliff + linear', hint: 'wait, then unlock gradually', icon: Hourglass },
  { kind: 'steps', label: 'monthly steps', hint: 'equal parts on a schedule', icon: Layers },
];

function Chips({ values, value, onChange, unit }: { values: number[]; value: number; onChange: (v: number) => void; unit: (v: number) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'border px-2.5 py-1.5 text-[11px] font-mono transition-colors',
            v === value ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/50',
          )}
        >
          {unit(v)}
        </button>
      ))}
    </div>
  );
}

/** Schedule type picker plus that type's controls. */
export function ScheduleFields({ value, onChange }: { value: ScheduleInput; onChange: (v: ScheduleInput) => void }) {
  const set = <K extends keyof ScheduleInput>(key: K, v: ScheduleInput[K]) => onChange({ ...value, [key]: v });
  const now = Math.floor(Date.now() / 1000);
  const { unlockTime } = resolveSchedule(value, now);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(({ kind: k, label, hint, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => set('kind', k)}
            className={cn(
              'border p-2.5 text-left space-y-1 transition-colors',
              k === value.kind ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/50',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <p className="text-[11px] font-medium leading-tight">{label}</p>
            <p className="hidden sm:block text-[10px] opacity-70 leading-tight">{hint}</p>
          </button>
        ))}
      </div>

      {value.kind === 'fixed' && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">unlock date and time - can be pushed later afterwards, never earlier</p>
          <div className="flex gap-2">
            <Input
              type="date"
              aria-label="unlock date"
              value={value.unlockDate}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => set('unlockDate', e.target.value)}
              className="text-base sm:text-sm flex-1 sm:flex-none sm:w-44"
            />
            <Input
              type="time"
              aria-label="unlock time"
              value={value.unlockClock}
              onChange={(e) => set('unlockClock', e.target.value)}
              className="text-base sm:text-sm w-32"
            />
          </div>
          {unlockTime > now && (
            <p className="text-[11px] text-muted-foreground">unlocks {format(unlockTime * 1000, "EEE MMM d, yyyy 'at' h:mm a")} (your time)</p>
          )}
        </div>
      )}
      {value.kind === 'cliffLinear' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">cliff - nothing unlocks before</p>
            <Chips values={[0, 30, 90, 180, 365]} value={value.cliffDays} onChange={(v) => set('cliffDays', v)} unit={(d) => (d === 0 ? 'none' : `${d}d`)} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">then unlocks gradually over</p>
            <Chips values={[30, 90, 180, 365, 730]} value={value.vestDays} onChange={(v) => set('vestDays', v)} unit={(d) => (d >= 365 ? `${d / 365}y` : `${d}d`)} />
          </div>
        </div>
      )}
      {value.kind === 'steps' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">number of equal parts</p>
            <Chips values={[3, 6, 12, 24, 36]} value={value.steps} onChange={(v) => set('steps', v)} unit={(n) => `${n}`} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">one part every</p>
            <Chips
              values={[7, 14, 30, 90]}
              value={value.stepDays}
              onChange={(v) => set('stepDays', v)}
              unit={(d) => (d === 30 ? 'month' : d === 90 ? 'quarter' : `${d}d`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
