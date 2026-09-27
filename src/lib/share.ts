import { format } from 'date-fns';

export type ShareStatus = 'locked' | 'pending' | 'withdrawable' | 'none';

// Common pair sides that aren't the project's own token
const QUOTE_TOKENS = new Set(['WETH', 'ETH', 'USDC', 'USDBC', 'USDT', 'DAI', 'CBBTC', 'CBETH', 'AERO', 'EURC']);

const X_HANDLE = '@aerolockvault';
// Aerodrome's account (rebranded to Aero)
const AERO_HANDLE = '@aeroxyz';

/** "vAMM-LNCTS/WETH" -> "LNCTS/WETH" */
export function pairName(lpSymbol?: string): string {
  return (lpSymbol ?? '').replace(/^[sv]AMM-/, '') || 'LP';
}

/** The project's side of the pair as a cashtag when X would link it: "vAMM-LNCTS/WETH" -> "$LNCTS" */
export function projectTag(lpSymbol?: string): string | null {
  const [a, b] = pairName(lpSymbol).split('/');
  if (!a || !b) return null;
  const project = QUOTE_TOKENS.has(a.toUpperCase()) && !QUOTE_TOKENS.has(b.toUpperCase()) ? b : a;
  return /^[A-Za-z][A-Za-z0-9]{0,11}$/.test(project) ? `$${project}` : project;
}

/** Post text that matches the lock's real on-chain state - never claims "locked" when it isn't. */
export function buildShareText(opts: {
  status: ShareStatus;
  /** LP symbol ("vAMM-X/WETH") for lp locks, token symbol for token locks */
  lpSymbol?: string;
  kind?: 'lp' | 'token';
  amount?: string;
  unlocksAt?: Date;
}): string {
  if (opts.kind === 'token') return buildTokenShareText(opts);
  const pair = pairName(opts.lpSymbol);
  const subject = projectTag(opts.lpSymbol) ?? pair;
  switch (opts.status) {
    case 'locked':
      return [
        `🔒 ${subject} liquidity is locked on ${X_HANDLE}`,
        '',
        `${opts.amount ? `${opts.amount} ` : ''}${pair} ${AERO_HANDLE} LP locked. any withdrawal needs 30 days' public on-chain notice.`,
        '',
        'check it live 👇',
      ].join('\n');
    case 'pending':
      return [
        `⚠️ a withdrawal has been triggered for ${subject} ${AERO_HANDLE} liquidity on ${X_HANDLE}${opts.unlocksAt ? `. it unlocks ${format(opts.unlocksAt, 'MMM d, yyyy')}` : ''}.`,
        '',
        'live status 👇',
      ].join('\n');
    case 'withdrawable':
      return [
        `⚠️ the 30-day notice has passed: ${subject} ${AERO_HANDLE} liquidity on ${X_HANDLE} can now be withdrawn.`,
        '',
        'live status 👇',
      ].join('\n');
    default:
      return [`${subject} locker on ${X_HANDLE}: no active locks right now.`, '', 'live status 👇'].join('\n');
  }
}

export function xShareUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/** Same honesty rules for plain-token locks; no Aerodrome tag since there's no pool. */
function buildTokenShareText(opts: { status: ShareStatus; lpSymbol?: string; amount?: string; unlocksAt?: Date }): string {
  const symbol = opts.lpSymbol ?? '';
  const subject = /^[A-Za-z][A-Za-z0-9]{0,11}$/.test(symbol) ? `$${symbol}` : symbol || 'token';
  switch (opts.status) {
    case 'locked':
      return [
        `🔒 ${opts.amount ? `${opts.amount} ` : ''}${subject} locked on ${X_HANDLE}`,
        '',
        "any withdrawal needs 30 days' public on-chain notice.",
        '',
        'check it live 👇',
      ].join('\n');
    case 'pending':
      return [
        `⚠️ a withdrawal has been triggered for ${subject} locked on ${X_HANDLE}${opts.unlocksAt ? `. it unlocks ${format(opts.unlocksAt, 'MMM d, yyyy')}` : ''}.`,
        '',
        'live status 👇',
      ].join('\n');
    case 'withdrawable':
      return [`⚠️ the 30-day notice has passed: ${subject} locked on ${X_HANDLE} can now be withdrawn.`, '', 'live status 👇'].join('\n');
    default:
      return [`${subject} locker on ${X_HANDLE}: no active locks right now.`, '', 'live status 👇'].join('\n');
  }
}
