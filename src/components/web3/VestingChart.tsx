import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { formatUnits } from 'viem';
import { curvePoints, fullyUnlockedAt, vestedAmount, vestedFraction, type Schedule } from '@/lib/web3/timelock/schedule';

const W = 600;
const H = 180;
const PAD = { top: 10, right: 8, bottom: 4, left: 44 };

interface VestingChartProps {
  schedule: Schedule;
  /** when set, the tooltip shows token amounts */
  total?: bigint;
  decimals?: number;
  symbol?: string;
  /** unix seconds; draws a "now" marker */
  now?: number;
}

/** Unlock curve over time: share of the lock available, with a hover readout. */
export function VestingChart({ schedule, total, decimals = 18, symbol, now }: VestingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const start = schedule.start;
  const end = fullyUnlockedAt(schedule);
  // a little room after the last unlock so the final step is visible
  const span = Math.max(end - start, 1);
  const tMax = end + span * 0.06;

  const x = (t: number) => PAD.left + ((t - start) / (tMax - start)) * (W - PAD.left - PAD.right);
  const y = (f: number) => PAD.top + (1 - f) * (H - PAD.top - PAD.bottom);

  const path = useMemo(() => {
    const pts = [...curvePoints(schedule), { t: tMax, f: 1 }];
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.f).toFixed(1)}`).join(' ');
    const area = `${line} L${x(tMax).toFixed(1)},${y(0)} L${x(start).toFixed(1)},${y(0)} Z`;
    return { line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, tMax]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = start + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (tMax - start);
    setHoverT(Math.min(tMax, Math.max(start, t)));
  };

  const hover = hoverT === null ? null : { t: hoverT, f: vestedFraction(schedule, hoverT) };
  const nowInRange = now !== undefined && now >= start && now <= tMax;
  const tipLeft = hover ? (x(hover.t) / W) * 100 : 0;

  return (
    <figure className="space-y-1.5">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-36 w-full touch-none select-none sm:h-44"
          preserveAspectRatio="none"
          role="img"
          aria-label={`unlock schedule from ${format(start * 1000, 'MMM d, yyyy')} to ${format(end * 1000, 'MMM d, yyyy')}`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHoverT(null)}
        >
          {/* recessive grid: 0%, 50%, 100% */}
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(f)}
              y2={y(f)}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={path.area} className="fill-foreground/10" />
          <path
            d={path.line}
            className="stroke-foreground"
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {nowInRange && (
            <g>
              <line
                x1={x(now)}
                x2={x(now)}
                y1={PAD.top}
                y2={y(0)}
                className="stroke-muted-foreground"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {hover && (
            <g>
              <line
                x1={x(hover.t)}
                x2={x(hover.t)}
                y1={PAD.top}
                y2={y(0)}
                className="stroke-foreground/40"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {hover && (
          <span
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
            style={{ left: `${(x(hover.t) / W) * 100}%`, top: `${(y(hover.f) / H) * 100}%` }}
          />
        )}

        {/* labels are HTML so they stay readable however wide the chart is drawn */}
        {[0, 0.5, 1].map((f) => (
          <span
            key={f}
            className="pointer-events-none absolute left-0 -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
            style={{
              top: `${(y(f) / H) * 100}%`,
              width: `${((PAD.left - 6) / W) * 100}%`,
              textAlign: 'right',
            }}
          >
            {f * 100}%
          </span>
        ))}
        {nowInRange && (
          <span
            className="pointer-events-none absolute top-0 font-mono text-[10px] text-muted-foreground"
            style={{ left: `calc(${(x(now!) / W) * 100}% + 4px)` }}
          >
            now
          </span>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-sm"
            style={{ left: `clamp(70px, ${tipLeft}%, calc(100% - 70px))` }}
          >
            <p className="font-mono text-muted-foreground">{format(hover.t * 1000, 'MMM d, yyyy')}</p>
            <p className="font-mono">
              {Math.round(hover.f * 1000) / 10}% unlocked
              {total !== undefined &&
                ` · ${Number(formatUnits(vestedAmount(schedule, total, hover.t), decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol ?? ''}`}
            </p>
          </div>
        )}
      </div>
      <figcaption
        className="flex justify-between font-mono text-[10px] text-muted-foreground"
        style={{ paddingLeft: `${(PAD.left / W) * 100}%` }}
      >
        <span>{format(start * 1000, 'MMM d, yyyy')}</span>
        <span>{format(end * 1000, 'MMM d, yyyy')}</span>
      </figcaption>
    </figure>
  );
}
