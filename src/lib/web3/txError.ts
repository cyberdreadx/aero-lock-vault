/** A short, human reason a wallet transaction didn't go through. */
export function txErrorMessage(error: unknown, fallback: string): string {
  const e = error as { shortMessage?: string; message?: string; name?: string } | undefined;
  const text = `${e?.name ?? ''} ${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase();
  if (text.includes('user rejected') || text.includes('user denied') || text.includes('rejected the request')) {
    return 'transaction cancelled in your wallet';
  }
  if (text.includes('insufficient funds') || text.includes('exceeds the balance')) {
    return 'not enough ETH on Base to cover this transaction plus gas';
  }
  return e?.shortMessage || e?.message || fallback;
}
