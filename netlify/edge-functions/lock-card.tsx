// 1200x630 link-preview image for a lock: /og/locked/<locker>.png
// Shows the live amount and status, so a shared link reads correctly without opening it.
import * as React from 'https://esm.sh/react@18.2.0';
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts';
import { readLockCardData, type LockCardData } from './_lib/lock-data.ts';

const FONT_BASE = 'https://cdn.jsdelivr.net/fontsource/fonts';
let fonts: Promise<ArrayBuffer[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ['inter@5.1.0/latin-400-normal.woff', 'inter@5.1.0/latin-700-normal.woff', 'jetbrains-mono@5.1.0/latin-500-normal.woff'].map(
      (f) => fetch(`${FONT_BASE}/${f}`).then((r) => r.arrayBuffer()),
    ),
  ));

const STATUS = {
  locked: { color: '#22c55e', label: 'LOCKED · NO WITHDRAWAL PENDING' },
  pending: { color: '#f59e0b', label: 'WITHDRAWAL PENDING' },
  withdrawable: { color: '#ef4444', label: 'WITHDRAWAL UNLOCKED' },
  none: { color: '#737373', label: 'NO ACTIVE LOCKS' },
} as const;

function Card({ d }: { d: LockCardData | null }) {
  const status = STATUS[d?.status ?? 'none'];
  const statusLabel =
    d?.status === 'pending' && d.unlocksAt ? `${status.label} · UNLOCKS ${d.unlocksAt.toISOString().slice(0, 10)}` : status.label;
  const footer =
    d?.status === 'locked'
      ? "any withdrawal needs 30 days' public on-chain notice"
      : d?.status === 'pending'
        ? 'the 30-day public notice is running'
        : 'live status on aerolock.app';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: '#0a0a0a',
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        color: '#f5f5f5',
        fontFamily: 'Inter',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* padlock */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 16, height: 12, border: '4px solid #0a0a0a', borderBottom: 'none', borderRadius: '8px 8px 0 0' }} />
              <div style={{ width: 24, height: 16, background: '#0a0a0a' }} />
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>aerolock</div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, color: '#a3a3a3', letterSpacing: 4 }}>
          {d ? (d.kind === 'lp' ? 'LP LOCK · BASE' : 'TOKEN LOCK · BASE') : 'BASE'}
        </div>
      </div>

      {/* amount */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 12,
            padding: '10px 18px',
            border: `2px solid ${status.color}`,
            color: status.color,
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            letterSpacing: 3,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: status.color }} />
          {statusLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 120, letterSpacing: -4, lineHeight: 1 }}>{d?.amount ?? '—'}</div>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#d4d4d4' }}>
            {d ? (d.kind === 'lp' ? `${d.asset} LP` : d.asset) : 'locker'}
          </div>
        </div>
        <div style={{ fontSize: 30, color: '#a3a3a3' }}>{footer}</div>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 22, color: '#737373' }}>
        <div>{d ? `aerolock.app/locked/${d.locker.slice(0, 6)}…${d.locker.slice(-4)}` : 'aerolock.app'}</div>
        <div>verified source · open contract</div>
      </div>
    </div>
  );
}

export default async (request: Request) => {
  const match = new URL(request.url).pathname.match(/\/og\/locked\/(0x[0-9a-fA-F]{40})(?:\.png)?$/);
  const data = match ? await readLockCardData(match[1]) : null;
  const [inter400, inter700, mono] = await loadFonts();

  return new ImageResponse(<Card d={data} />, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
      { name: 'Inter', data: inter700, weight: 700, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ],
    headers: {
      // status can change; keep previews fresh without re-rendering on every hit
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
};

export const config = { path: '/og/locked/*' };
