/** ETH that `wallet` sent to the treasury in `tx` (see ethSent). */
export function paidToTreasury(
  tx: { hash: string; from: string; to: string | null; value: bigint },
  wallet: string,
  treasuryAddress: string,
): Promise<bigint | null> {
  return ethSent(tx, wallet, treasuryAddress);
}

/**
 * ETH that `sender` sent to `recipient` in `tx`. Regular wallets send it as the
 * transaction itself; smart wallets (e.g. the Base app) send it as an internal call
 * inside a bundled/self-executed transaction, which only a trace shows. The public
 * Base RPC has no tracing, so internal calls come from Blockscout.
 * Returns null when internal calls couldn't be read (not indexed yet / API down).
 */
export async function ethSent(
  tx: { hash: string; from: string; to: string | null; value: bigint },
  sender: string,
  recipient: string,
): Promise<bigint | null> {
  const from = sender.toLowerCase();
  const to = recipient.toLowerCase();
  if (tx.from.toLowerCase() === from && tx.to?.toLowerCase() === to) return tx.value;

  type InternalCall = {
    type?: string;
    success?: boolean;
    error?: string | null;
    value?: string;
    from?: { hash?: string } | null;
    to?: { hash?: string } | null;
  };
  try {
    // bundled smart-wallet txs can hold many internal calls; Blockscout pages them 50 at a time
    let total = 0n;
    let next: Record<string, string | number> | null = null;
    for (let page = 0; page < 40; page++) {
      const query: string = next ? `?${new URLSearchParams(Object.entries(next).map(([k, v]) => [k, String(v)]))}` : '';
      const res: Response = await fetch(`https://base.blockscout.com/api/v2/transactions/${tx.hash}/internal-transactions${query}`);
      if (!res.ok) return null;
      const body: { items?: InternalCall[]; next_page_params?: Record<string, string | number> | null } = await res.json();
      const items = body?.items ?? [];
      for (const i of items) {
        if (
          i.type === 'call' &&
          i.success !== false &&
          !i.error &&
          i.from?.hash?.toLowerCase() === from &&
          i.to?.hash?.toLowerCase() === to
        ) {
          total += BigInt(i.value ?? '0');
        }
      }
      next = body?.next_page_params ?? null;
      if (!next) return total;
    }
    return null; // too many internal calls to scan
  } catch (error) {
    console.warn('internal transaction lookup failed', error);
    return null;
  }
}
