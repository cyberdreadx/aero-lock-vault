import { cn } from '@/lib/utils';

const TONES = {
  green: 'border-green-500/40 text-green-500',
  amber: 'border-amber-500/40 text-amber-500',
  red: 'border-red-500/40 text-red-500',
  muted: 'border-border text-muted-foreground',
} as const;

/** Small status label with a dot: text carries the meaning, color only reinforces it. */
export function StatusPill({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', TONES[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
