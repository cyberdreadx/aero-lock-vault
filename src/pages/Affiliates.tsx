import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatEther, isAddress, isHash } from 'viem';
import { format } from 'date-fns';
import { Check, Copy, ExternalLink, Link2, Share2, Wallet } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeading } from '@/components/layout/PageHeading';
import { WalletButton } from '@/components/web3/WalletButton';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useEthPrice } from '@/hooks/useEthPrice';
import { sumWei, useAffiliateReferrals, useRecordPayout, useUnpaidReferrals, type Referral } from '@/hooks/useAffiliate';
import { AFFILIATE_COMMISSION_PERCENT, affiliateLink } from '@/lib/referral';
import { buildAffiliateShareText, xShareUrl } from '@/lib/share';
import { BASE_SCAN_URL, DEPLOYMENT_FEE_USD, isAdminWallet } from '@/lib/web3/constants';
import { txErrorMessage } from '@/lib/web3/txError';

const commission = (usd: number) => (usd * AFFILIATE_COMMISSION_PERCENT) / 100;

function eth(wei: bigint): string {
  const n = Number(formatEther(wei));
  return n === 0 ? '0' : n < 0.00001 ? '<0.00001' : n.toFixed(5).replace(/\.?0+$/, '');
}

function Usd({ wei }: { wei: bigint }) {
  const { data: price } = useEthPrice();
  if (!price || wei === 0n) return null;
  return <span className="text-muted-foreground"> ≈ ${(Number(formatEther(wei)) * price).toFixed(2)}</span>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="border border-border bg-card p-4 space-y-1 min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-mono text-lg sm:text-xl tracking-tight truncate">{value}</p>
      {sub && <p className="text-[11px] truncate">{sub}</p>}
    </div>
  );
}

const STEPS = [
  { title: 'share your link', body: 'post it on x, telegram or discord. lock pages you share carry it too.' },
  { title: 'they lock with aerolock', body: 'any paid lp lock, token lock, timed or vesting lock, or team vesting within 30 days of clicking your link counts.' },
  {
    title: `you earn ${AFFILIATE_COMMISSION_PERCENT}%`,
    body: `about $${commission(DEPLOYMENT_FEE_USD)} per $${DEPLOYMENT_FEE_USD} locker, $${commission(150)} per timed or vesting lock, and more for team vestings - paid in ETH on base.`,
  },
];

export default function Affiliates() {
  const { address, isConnected } = useAccount();
  const isAdmin = isAdminWallet(address);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-10">
          <PageHeading
            eyebrow="affiliate program"
            title={`earn ${AFFILIATE_COMMISSION_PERCENT}% on every locker you refer`}
            description="no sign-up. connect a wallet, share your link, get paid in ETH."
          />

          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border border-border bg-card p-4 space-y-2">
                <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>

          {!isConnected || !address ? (
            <div className="border border-dashed border-border px-6 py-12 text-center space-y-4">
              <Wallet className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="text-sm">connect a wallet to get your referral link</p>
              <div className="flex justify-center">
                <WalletButton size="default" />
              </div>
            </div>
          ) : (
            <AffiliateDashboard wallet={address} />
          )}

          {isAdmin && <PayoutAdmin />}

          <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1 border-t border-border pt-6">
            <p className="font-medium text-foreground">terms</p>
            <p>• the last referral link a buyer opened in the 30 days before deploying gets the credit.</p>
            <p>• commission is {AFFILIATE_COMMISSION_PERCENT}% of the ETH fee actually paid. free (admin) deployments and referring your own wallet don't count.</p>
            <p>• commissions are paid in ETH on base in regular batches. every payout is checked on-chain and linked in your sales list.</p>
            <p>• aerolock may withhold commission on self-referrals through other wallets or other abuse.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function AffiliateDashboard({ wallet }: { wallet: string }) {
  const { data: referrals, isLoading } = useAffiliateReferrals(wallet);
  const [copied, setCopied] = useState(false);
  const link = affiliateLink(wallet);

  const earned = sumWei(referrals ?? []);
  const paid = sumWei((referrals ?? []).filter((r) => r.paid_tx_hash));
  const owed = earned - paid;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ description: 'referral link copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-6">
      <div className="border border-border bg-card p-4 sm:p-5 space-y-3">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Link2 className="h-3 w-3" /> your referral link
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 min-w-0 border border-border bg-muted/40 px-3 py-2.5 text-xs font-mono [overflow-wrap:anywhere]">
            {link}
          </code>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-10" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} copy
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-10"
              onClick={() => window.open(xShareUrl(buildAffiliateShareText(), link), '_blank', 'noopener,noreferrer')}
            >
              <Share2 className="h-3.5 w-3.5" /> post on x
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="referred sales" value={isLoading ? '…' : String(referrals?.length ?? 0)} />
        <Stat label="earned" value={`${eth(earned)} ETH`} sub={<Usd wei={earned} />} />
        <Stat label="paid out" value={`${eth(paid)} ETH`} sub={<Usd wei={paid} />} />
        <Stat label="owed to you" value={`${eth(owed)} ETH`} sub={<Usd wei={owed} />} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">referred sales</h2>
        {!isLoading && (!referrals || referrals.length === 0) ? (
          <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            no referred sales yet. share your link to start earning.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {(referrals ?? []).map((r) => (
              <ReferralRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const PRODUCT_LABEL: Record<string, string> = { locker: 'locker', timelock: 'timed lock', team: 'team vesting' };

function ReferralRow({ r }: { r: Referral }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-muted-foreground shrink-0">{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
        <Link
          to={(r.product ?? 'locker') === 'locker' ? `/locked/${r.locker_address}` : `/vault/${r.locker_address}`}
          className="font-mono truncate hover:underline"
        >
          {PRODUCT_LABEL[r.product ?? 'locker'] ?? 'locker'} {r.locker_address.slice(0, 6)}…{r.locker_address.slice(-4)}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono">+{eth(BigInt(r.commission_wei))} ETH</span>
        {r.paid_tx_hash ? (
          <a
            href={`${BASE_SCAN_URL}/tx/${r.paid_tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-500 hover:underline"
          >
            paid <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-amber-500">owed</span>
        )}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ treasury payouts

function PayoutAdmin() {
  const { data: unpaid, isLoading } = useUnpaidReferrals(true);

  const byAffiliate = useMemo(() => {
    const groups = new Map<string, Referral[]>();
    for (const r of unpaid ?? []) groups.set(r.referrer, [...(groups.get(r.referrer) ?? []), r]);
    return [...groups.entries()]
      .map(([affiliate, rows]) => ({ affiliate, rows, owed: sumWei(rows) }))
      .sort((a, b) => (b.owed > a.owed ? 1 : -1));
  }, [unpaid]);
  const totalOwed = byAffiliate.reduce((t, a) => t + a.owed, 0n);

  return (
    <section className="space-y-4 border border-amber-500/40 p-4 sm:p-5">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500">treasury only</p>
        <h2 className="text-sm font-semibold tracking-tight">affiliate payouts</h2>
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'loading…' : `${eth(totalOwed)} ETH owed across ${byAffiliate.length} affiliate${byAffiliate.length === 1 ? '' : 's'}.`}{' '}
          paying sends ETH from this wallet, then records it once base confirms it.
        </p>
      </div>
      {byAffiliate.length > 0 && (
        <ul className="divide-y divide-border border border-border">
          {byAffiliate.map((a) => (
            <PayoutRow key={a.affiliate} affiliate={a.affiliate} owed={a.owed} sales={a.rows.length} />
          ))}
        </ul>
      )}
      <ManualPayout />
    </section>
  );
}

function PayoutRow({ affiliate, owed, sales }: { affiliate: string; owed: bigint; sales: number }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [hash, setHash] = useState<`0x${string}`>();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash, chainId: base.id });
  const record = useRecordPayout();

  const recordPayout = (txHash: string) =>
    record.mutate(
      { txHash, affiliate },
      {
        onSuccess: (r) => toast({ description: `payout recorded: ${r.commissionsPaid} commission${r.commissionsPaid === 1 ? '' : 's'} marked paid` }),
        onError: (e) => toast({ description: (e as Error).message, variant: 'destructive' }),
      },
    );

  useEffect(() => {
    if (confirmed && hash) recordPayout(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, hash]);

  const pay = async () => {
    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
      setHash(await sendTransactionAsync({ to: affiliate as `0x${string}`, value: owed, chainId: base.id }));
    } catch (e) {
      toast({ description: txErrorMessage(e, 'payout failed'), variant: 'destructive' });
    }
  };

  const busy = isPending || confirming || record.isPending;
  return (
    <li className="flex flex-col gap-3 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5 min-w-0">
        <AddressDisplay address={affiliate} />
        <p className="text-muted-foreground">
          {sales} sale{sales === 1 ? '' : 's'} · <span className="font-mono text-foreground">{eth(owed)} ETH</span>
          <Usd wei={owed} />
        </p>
      </div>
      {hash && record.isError ? (
        <Button size="sm" variant="outline" className="text-xs" onClick={() => recordPayout(hash)}>
          retry recording
        </Button>
      ) : (
        <Button size="sm" className="text-xs" disabled={busy || record.isSuccess} onClick={pay}>
          {isPending ? 'confirm in wallet…' : confirming ? 'confirming…' : record.isPending ? 'recording…' : record.isSuccess ? 'paid' : `pay ${eth(owed)} ETH`}
        </Button>
      )}
    </li>
  );
}

/** Records a payout sent some other way, or one whose recording didn't finish. */
function ManualPayout() {
  const [affiliate, setAffiliate] = useState('');
  const [txHash, setTxHash] = useState('');
  const record = useRecordPayout();
  const valid = isAddress(affiliate.trim(), { strict: false }) && isHash(txHash.trim());

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">record a payout by transaction hash</summary>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="affiliate wallet 0x…" value={affiliate} onChange={(e) => setAffiliate(e.target.value)} className="font-mono text-base sm:text-xs" />
        <Input placeholder="payout tx hash 0x…" value={txHash} onChange={(e) => setTxHash(e.target.value)} className="font-mono text-base sm:text-xs" />
        <Button
          size="sm"
          className="text-xs h-10"
          disabled={!valid || record.isPending}
          onClick={() =>
            record.mutate(
              { txHash: txHash.trim(), affiliate: affiliate.trim() },
              {
                onSuccess: (r) => {
                  toast({ description: `recorded: ${r.commissionsPaid} commission${r.commissionsPaid === 1 ? '' : 's'} marked paid` });
                  setAffiliate('');
                  setTxHash('');
                },
                onError: (e) => toast({ description: (e as Error).message, variant: 'destructive' }),
              },
            )
          }
        >
          {record.isPending ? 'checking…' : 'record'}
        </Button>
      </div>
    </details>
  );
}
