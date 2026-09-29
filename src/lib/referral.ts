// Affiliate links: aerolock.app/?ref=<wallet>. The last referrer seen is remembered for
// 30 days and sent along when a paid locker is recorded, which credits the commission.
import { isAddress } from 'viem';

const STORAGE_KEY = 'aerolock:referrer';
const REFERRAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const AFFILIATE_COMMISSION_PERCENT = 20;

/** Remembers `?ref=` from the current URL, if it's a wallet address. */
export function captureReferral(search: string): void {
  const ref = new URLSearchParams(search).get('ref');
  if (!ref || !isAddress(ref, { strict: false })) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ref: ref.toLowerCase(), at: Date.now() }));
  } catch {
    // storage blocked (private mode); the referral just isn't remembered
  }
}

/** The referrer to credit, or undefined when none or expired. */
export function getReferrer(): string | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { ref?: string; at?: number } | null;
    if (!saved?.ref || !saved.at || Date.now() - saved.at > REFERRAL_WINDOW_MS) return undefined;
    return saved.ref;
  } catch {
    return undefined;
  }
}

/** `url` with the given wallet as its referrer. */
export function withReferral(url: string, wallet?: string): string {
  if (!wallet) return url;
  const u = new URL(url);
  u.searchParams.set('ref', wallet.toLowerCase());
  return u.toString();
}

export function affiliateLink(wallet: string): string {
  return withReferral(`${window.location.origin}/`, wallet);
}

// ascii "aeref:" - marks the referrer appended to timed-lock transactions
const REFERRAL_TAG_PREFIX = '61657265663a';

/**
 * Bytes to append to a timed-lock factory call so the sale credits the current referrer.
 * The contract ignores trailing calldata; record-timelock-sale reads it from the signed tx.
 */
export function referralTag(buyer: string): `0x${string}` {
  const ref = getReferrer();
  if (!ref || ref === buyer.toLowerCase()) return '0x';
  return `0x${REFERRAL_TAG_PREFIX}${ref.slice(2)}`;
}
