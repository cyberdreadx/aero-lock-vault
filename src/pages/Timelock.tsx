import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { concat, encodeFunctionData, erc20Abi, formatEther, formatUnits, isAddress, parseUnits } from 'viem';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, Hourglass, Plus, Rocket, X } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
import { VestingChart } from '@/components/web3/VestingChart';
import { formatCountdown, useSecondsUntil } from '@/components/web3/Countdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AssetPicker, type Asset } from '@/components/web3/timelock/AssetPicker';
import { ScheduleFields, defaultScheduleInput, resolveSchedule, type ScheduleInput } from '@/components/web3/timelock/ScheduleFields';
import { toast } from '@/hooks/use-toast';
import { useEthPrice } from '@/hooks/useEthPrice';
import { supabase } from '@/integrations/supabase/client';
import { useBaseTx } from '@/hooks/web3/useBaseTx';
import {
  useFactoryAllowance,
  useTeamBatch,
  useTeamBatchesOf,
  useTimelockBatchFee,
  useTimelockFactoryDeployed,
  useTimelockFee,
  useTimelockVaults,
  useVault,
} from '@/hooks/web3/useTimelock';
import { canUseTimelocks, isAdminWallet } from '@/lib/web3/constants';
import { factoryEvents } from '@/lib/web3/timelock/events';
import { txErrorMessage } from '@/lib/web3/txError';
import {
  TIMELOCK_CREATE2_DEPLOYER,
  TIMELOCK_FACTORY_ABI,
  TIMELOCK_FACTORY_ADDRESS,
  TIMELOCK_FACTORY_INITCODE,
  TIMELOCK_FACTORY_SALT,
} from '@/lib/web3/timelock/artifacts';
import { KIND_INDEX, describeSchedule, fullyUnlockedAt, nextUnlockAt } from '@/lib/web3/timelock/schedule';
import { cn } from '@/lib/utils';

const FACTORY = TIMELOCK_FACTORY_ADDRESS as `0x${string}`;
// the contract refunds anything above the fee; this absorbs price moves while signing
const FEE_BUFFER_PERCENT = 3n;
const fmtDate = (t: number) => format(t * 1000, 'MMM d, yyyy h:mm a');

export default function Timelock() {
  const { address, isConnected } = useAccount();
  const beta = canUseTimelocks(address);
  const { data: deployed, isLoading } = useTimelockFactoryDeployed();

  if (!isConnected || !address) {
    return <ConnectGate title="connect wallet" description="timed and vesting locks for any base token or aerodrome lp." />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <PageHeading
            eyebrow="timed & vesting locks"
            title="lock until a date, or unlock over time"
            description="for any base token or aerodrome lp. nobody can unlock early - not you, not us."
          />

          {!beta ? (
            <div className="border border-dashed border-border px-6 py-12 text-center space-y-2">
              <Hourglass className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">coming soon</p>
              <p className="text-xs text-muted-foreground">timed and vesting locks are in private testing. follow @aerolockvault for launch.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 border border-amber-500/40 bg-amber-500/5 p-4 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">private beta, not yet audited.</span> only your wallet can see
                  this page. test with small amounts - a lock can never be undone, even by aerolock.
                </p>
              </div>
              {isLoading ? (
                <div className="h-40 border border-border bg-muted/30 animate-pulse" />
              ) : !deployed ? (
                <DeployFactory canDeploy={isAdminWallet(address)} />
              ) : (
                <>
                  {isAdminWallet(address) && <AdminFeeExempt wallet={address} />}
                  <CreatePanel wallet={address} />
                  <MyTeams wallet={address} />
                  <MyVaults wallet={address} />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------- deploy

function DeployFactory({ canDeploy }: { canDeploy: boolean }) {
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();

  const deploy = async () => {
    try {
      toast({ description: 'confirm the deployment in your wallet...' });
      await send('deploying', {
        to: TIMELOCK_CREATE2_DEPLOYER,
        data: concat([TIMELOCK_FACTORY_SALT, TIMELOCK_FACTORY_INITCODE]),
      });
      toast({ description: 'timed-lock contract deployed' });
      queryClient.invalidateQueries({ queryKey: ['timelock-factory-deployed'] });
    } catch (e) {
      toast({ description: txErrorMessage(e, 'deployment failed'), variant: 'destructive' });
    }
  };

  return (
    <section className="border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        <h2 className="text-sm font-semibold tracking-tight">step 0 · deploy the timed-lock contract</h2>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
        <p>one transaction, about $0.05 of gas. it always lands at the same address and is always owned by the aerolock treasury, whoever sends it.</p>
        <p className="font-mono [overflow-wrap:anywhere]">{TIMELOCK_FACTORY_ADDRESS}</p>
        <p>fee: $150 per lock, or $150 + $25 per extra wallet for team vesting - priced live with chainlink. you can change it later.</p>
      </div>
      <Button className="w-full sm:w-auto text-xs" disabled={!canDeploy || !!busy} onClick={deploy}>
        {busy ? 'deploying...' : 'deploy contract'}
      </Button>
    </section>
  );
}

// ----------------------------------------------------------------- admin

/** The factory charges its owner too until the owner exempts their own wallet. */
function AdminFeeExempt({ wallet }: { wallet: `0x${string}` }) {
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();
  const { data: fee } = useTimelockFee(wallet);
  if (fee === undefined || fee === 0n) return null;

  const exempt = async () => {
    try {
      await send('exempting', {
        to: FACTORY,
        data: encodeFunctionData({ abi: TIMELOCK_FACTORY_ABI, functionName: 'setFeeExempt', args: [wallet, true] }),
      });
      toast({ description: 'your wallet now locks for free' });
      queryClient.invalidateQueries({ queryKey: ['timelock-fee'] });
    } catch (e) {
      toast({ description: txErrorMessage(e, 'update failed'), variant: 'destructive' });
    }
  };

  return (
    <section className="flex flex-col gap-3 border border-border bg-card p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">admin:</span> your wallet is still charged the $150 fee (it pays itself). make it
        fee-free - customers still pay.
      </p>
      <Button size="sm" className="text-xs shrink-0" disabled={!!busy} onClick={exempt}>
        {busy ? 'updating...' : 'make my wallet fee-free'}
      </Button>
    </section>
  );
}

// ----------------------------------------------------------------- create

function CreatePanel({ wallet }: { wallet: `0x${string}` }) {
  const [mode, setMode] = useState<'single' | 'team'>('single');
  return (
    <section className="border border-border bg-card p-4 sm:p-5 space-y-6">
      <div className="grid grid-cols-2 border border-border p-0.5 text-xs">
        {(
          [
            ['single', 'single lock', 'one wallet, one schedule'],
            ['team', 'team vesting', 'many wallets, one transaction'],
          ] as const
        ).map(([m, label, hint]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn('px-3 py-2 text-left transition-colors', mode === m ? 'bg-foreground text-background' : 'hover:bg-muted')}
          >
            <span className="block font-medium">{label}</span>
            <span className="block text-[10px] opacity-70">{hint}</span>
          </button>
        ))}
      </div>
      {mode === 'single' ? <SingleLock wallet={wallet} /> : <TeamLock wallet={wallet} />}
    </section>
  );
}

function parseAmount(value: string, decimals?: number): bigint | null {
  try {
    return decimals !== undefined && value.trim() ? parseUnits(value.trim(), decimals) : null;
  } catch {
    return null;
  }
}

const fmtAmount = (wei: bigint, decimals: number) =>
  Number(formatUnits(wei, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });

function FeeLine({ fee, note }: { fee?: bigint; note?: string }) {
  const { data: ethPrice } = useEthPrice();
  const usd = fee !== undefined && ethPrice ? Number(formatEther(fee)) * ethPrice : null;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">fee{note && <span> · {note}</span>}</span>
      <span className="font-mono">
        {fee === undefined ? '…' : fee === 0n ? 'free' : `${Number(formatEther(fee)).toFixed(5)} ETH`}
        {usd !== null && fee !== 0n && <span className="text-muted-foreground"> ≈ ${usd.toFixed(0)}</span>}
      </span>
    </div>
  );
}

/** Approve (if needed) then run `action`, one button. */
function ApproveThen({
  asset,
  wallet,
  total,
  problem,
  busy,
  send,
  label,
  action,
}: {
  asset: Asset | null;
  wallet: `0x${string}`;
  total: bigint | null;
  problem: string | null;
  busy: string | null;
  send: ReturnType<typeof useBaseTx>['send'];
  label: string;
  action: () => void;
}) {
  const { data: allowance, refetch } = useFactoryAllowance(asset?.address, wallet);
  const needsApproval = !!total && (allowance ?? 0n) < total;
  const approve = async () => {
    try {
      await send('approving', {
        to: asset!.address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [FACTORY, total!] }),
      });
      await refetch();
    } catch (e) {
      toast({ description: txErrorMessage(e, 'approval failed'), variant: 'destructive' });
    }
  };
  if (problem) {
    return (
      <Button className="w-full text-xs" disabled>
        {problem}
      </Button>
    );
  }
  return needsApproval ? (
    <Button className="w-full text-xs" disabled={!!busy} onClick={approve}>
      {busy === 'approving' ? 'approving...' : `1/2 · approve ${asset!.symbol}`}
    </Button>
  ) : (
    <Button className="w-full text-xs" disabled={!!busy} onClick={action}>
      {busy === 'locking' ? 'locking...' : label}
    </Button>
  );
}

const BUFFER_NOTE =
  'a few % extra ETH is sent to cover price moves while you sign; the contract refunds everything above the fee in the same transaction.';

function SingleLock({ wallet }: { wallet: `0x${string}` }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();
  const { data: fee } = useTimelockFee(wallet);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState('');
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(defaultScheduleInput);
  const [beneficiary, setBeneficiary] = useState('');

  const now = Math.floor(Date.now() / 1000);
  const { schedule, problem: scheduleProblem, params } = resolveSchedule(scheduleInput, now);
  const amountWei = parseAmount(amount, asset?.decimals);
  const owner = (beneficiary.trim() || wallet) as `0x${string}`;

  const problem = !asset
    ? 'pick a token or lp'
    : !amountWei || amountWei <= 0n
      ? 'enter an amount'
      : amountWei > asset.balance
        ? `you only have ${formatUnits(asset.balance, asset.decimals)} ${asset.symbol}`
        : !isAddress(owner, { strict: false })
          ? 'beneficiary must be a wallet address'
          : (scheduleProblem ?? (fee === undefined ? 'loading the fee...' : null));

  const create = async () => {
    try {
      const receipt = await send('locking', {
        to: FACTORY,
        value: fee! + (fee! * FEE_BUFFER_PERCENT) / 100n,
        data: encodeFunctionData({
          abi: TIMELOCK_FACTORY_ABI,
          functionName: 'createLock',
          args: [{ token: asset!.address, amount: amountWei!, owner, feeReceiver: owner, kind: KIND_INDEX[scheduleInput.kind], ...params }],
        }),
      });
      const [vault] = factoryEvents(receipt.logs).vaults;
      toast({ description: 'locked 🔒' });
      queryClient.invalidateQueries({ queryKey: ['timelock-vaults'] });
      // show the new lock as verified source on Basescan; best effort, never blocks the user
      if (vault) supabase.functions.invoke('verify-timelock', { body: { vaultAddress: vault } }).catch(() => undefined);
      if (vault) navigate(`/vault/${vault}`);
    } catch (e) {
      toast({ description: txErrorMessage(e, 'lock failed'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs">what to lock</Label>
        <AssetPicker
          wallet={wallet}
          value={asset}
          onChange={(a) => {
            setAsset(a);
            setAmount('');
          }}
        />
      </div>

      {asset && (
        <div className="space-y-2">
          <Label className="text-xs">
            amount of {asset.symbol}
            {asset.isLP && <span className="text-muted-foreground"> · lp keeps earning aerodrome fees while locked</span>}
          </Label>
          <div className="flex gap-2">
            <Input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono text-base sm:text-sm" />
            <Button type="button" variant="outline" className="text-xs h-10" onClick={() => setAmount(formatUnits(asset.balance, asset.decimals))}>
              max
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-xs">unlock schedule</Label>
        <ScheduleFields value={scheduleInput} onChange={setScheduleInput} />
        {!scheduleProblem && (
          <div className="border border-border p-3 space-y-2">
            <p className="text-xs">{describeSchedule(schedule, fmtDate)}</p>
            <VestingChart schedule={schedule} total={amountWei ?? undefined} decimals={asset?.decimals} symbol={asset?.symbol} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">
          who receives it <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          placeholder={`you (${wallet.slice(0, 6)}…${wallet.slice(-4)}) - or a team member / investor wallet`}
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          className="font-mono text-base sm:text-xs"
        />
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <FeeLine fee={fee} />
        <ApproveThen
          asset={asset}
          wallet={wallet}
          total={amountWei}
          problem={problem}
          busy={busy}
          send={send}
          label={`lock ${amount} ${asset?.symbol ?? ''}`}
          action={create}
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">{BUFFER_NOTE}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- team

interface Member {
  id: number;
  wallet: string;
  amount: string;
  schedule: ScheduleInput;
  editing: boolean;
}

let memberSeq = 0;
const newMember = (schedule: ScheduleInput, wallet = '', amount = ''): Member => ({
  id: ++memberSeq,
  wallet,
  amount,
  schedule: { ...schedule },
  editing: false,
});

const MAX_TEAM = 40;

function TeamLock({ wallet }: { wallet: `0x${string}` }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [label, setLabel] = useState('team vesting');
  const [members, setMembers] = useState<Member[]>(() => [{ ...newMember(defaultScheduleInput()), editing: true }]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const { data: fee } = useTimelockBatchFee(wallet, members.length);
  const now = Math.floor(Date.now() / 1000);

  const update = (id: number, patch: Partial<Member>) => setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const addMember = () =>
    setMembers((ms) => [...ms.map((m) => ({ ...m, editing: false })), { ...newMember(ms[ms.length - 1]?.schedule ?? defaultScheduleInput()), editing: true }]);

  // "0xabc…, 1000" per line; new rows copy the last row's schedule
  const importList = () => {
    const rows = pasteText
      .split(/\n+/)
      .map((line) => line.split(/[\s,;]+/).filter(Boolean))
      .filter((cells) => cells.length >= 2 && isAddress(cells[0], { strict: false }));
    if (rows.length === 0) return toast({ description: 'no "wallet, amount" lines found', variant: 'destructive' });
    setMembers((ms) => {
      const template = ms[ms.length - 1]?.schedule ?? defaultScheduleInput();
      const kept = ms.filter((m) => m.wallet.trim() || m.amount.trim());
      return [...kept, ...rows.map(([w, a]) => newMember(template, w, a))].slice(0, MAX_TEAM);
    });
    setPasteText('');
    setPasteOpen(false);
  };

  const resolved = members.map((m) => ({ m, amount: parseAmount(m.amount, asset?.decimals), ...resolveSchedule(m.schedule, now) }));
  const total = resolved.reduce((t, r) => t + (r.amount ?? 0n), 0n);
  const badIndex = resolved.findIndex(
    (r) => !isAddress(r.m.wallet.trim(), { strict: false }) || !r.amount || r.amount <= 0n || r.problem,
  );
  const bad = badIndex >= 0 ? resolved[badIndex] : null;

  const problem = !asset
    ? 'pick a token or lp'
    : members.length > MAX_TEAM
      ? `at most ${MAX_TEAM} wallets per batch`
      : bad
        ? !isAddress(bad.m.wallet.trim(), { strict: false })
          ? `wallet ${badIndex + 1}: enter a valid address`
          : !bad.amount || bad.amount <= 0n
            ? `wallet ${badIndex + 1}: enter an amount`
            : `wallet ${badIndex + 1}: ${bad.problem}`
        : total > asset.balance
          ? `total ${fmtAmount(total, asset.decimals)} is more than your ${fmtAmount(asset.balance, asset.decimals)} ${asset.symbol}`
          : new TextEncoder().encode(label).length > 64
            ? 'label is too long'
            : fee === undefined
              ? 'loading the fee...'
              : null;

  const create = async () => {
    try {
      const receipt = await send('locking', {
        to: FACTORY,
        value: fee! + (fee! * FEE_BUFFER_PERCENT) / 100n,
        data: encodeFunctionData({
          abi: TIMELOCK_FACTORY_ABI,
          functionName: 'createLocks',
          args: [
            resolved.map((r) => ({
              token: asset!.address,
              amount: r.amount!,
              owner: r.m.wallet.trim() as `0x${string}`,
              feeReceiver: r.m.wallet.trim() as `0x${string}`,
              kind: KIND_INDEX[r.m.schedule.kind],
              ...r.params,
            })),
            label.trim(),
          ],
        }),
      });
      const { vaults, batchId } = factoryEvents(receipt.logs);
      toast({ description: `${vaults.length} team locks created 🔒` });
      queryClient.invalidateQueries({ queryKey: ['timelock-vaults'] });
      queryClient.invalidateQueries({ queryKey: ['timelock-batches-of'] });
      for (const vault of vaults) supabase.functions.invoke('verify-timelock', { body: { vaultAddress: vault } }).catch(() => undefined);
      if (batchId !== undefined) navigate(`/team/${batchId}`);
    } catch (e) {
      toast({ description: txErrorMessage(e, 'team lock failed'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground leading-relaxed">
        each wallet gets its own lock with its own amount and schedule. members withdraw with their own wallet; nobody - including you - can take
        anyone's tokens back or unlock them early.
      </p>

      <div className="space-y-2">
        <Label className="text-xs">token or lp for the team</Label>
        <AssetPicker wallet={wallet} value={asset} onChange={setAsset} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">name <span className="text-muted-foreground">(shown on the public team page)</span></Label>
        <Input value={label} maxLength={64} onChange={(e) => setLabel(e.target.value)} className="text-base sm:text-sm" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            wallets <span className="text-muted-foreground">({members.length}/{MAX_TEAM})</span>
          </Label>
          <button type="button" onClick={() => setPasteOpen((o) => !o)} className="text-[11px] text-muted-foreground hover:text-foreground underline">
            paste a list
          </button>
        </div>

        {pasteOpen && (
          <div className="space-y-2 border border-border p-3">
            <p className="text-[11px] text-muted-foreground">one per line: wallet, amount. new rows copy the last row's schedule.</p>
            <Textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'0x1234…abcd, 50000\n0x5678…ef01, 25000'}
              className="font-mono text-base sm:text-xs"
            />
            <Button size="sm" variant="outline" className="text-xs" onClick={importList}>
              add these wallets
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {resolved.map(({ m, amount, schedule, problem: rowProblem }, i) => (
            <li key={m.id} className="border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
                {members.length > 1 && (
                  <button
                    type="button"
                    aria-label={`remove wallet ${i + 1}`}
                    onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="wallet 0x…"
                  value={m.wallet}
                  onChange={(e) => update(m.id, { wallet: e.target.value })}
                  className="font-mono text-base sm:text-xs sm:flex-[3]"
                />
                <Input
                  inputMode="decimal"
                  placeholder={`amount${asset ? ` of ${asset.symbol}` : ''}`}
                  value={m.amount}
                  onChange={(e) => update(m.id, { amount: e.target.value })}
                  className="font-mono text-base sm:text-xs sm:flex-[2]"
                />
              </div>
              <button
                type="button"
                onClick={() => update(m.id, { editing: !m.editing })}
                className="flex w-full items-center justify-between gap-2 text-left text-[11px]"
              >
                <span className={cn('truncate', rowProblem ? 'text-amber-500' : 'text-muted-foreground')}>
                  {rowProblem ?? describeSchedule(schedule, fmtDate)}
                  {!rowProblem && amount && asset && ` · ${fmtAmount(amount, asset.decimals)} ${asset.symbol}`}
                </span>
                <span className="shrink-0 underline">{m.editing ? 'done' : 'edit schedule'}</span>
              </button>
              {m.editing && <ScheduleFields value={m.schedule} onChange={(schedule) => update(m.id, { schedule })} />}
            </li>
          ))}
        </ul>
        {members.length < MAX_TEAM && (
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addMember}>
            <Plus className="h-3.5 w-3.5" /> add wallet
          </Button>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">total to lock</span>
          <span className="font-mono">{asset ? `${fmtAmount(total, asset.decimals)} ${asset.symbol}` : '…'}</span>
        </div>
        <FeeLine fee={fee} note={`$150 + $25 × ${Math.max(members.length - 1, 0)} extra`} />
        <ApproveThen
          asset={asset}
          wallet={wallet}
          total={total > 0n ? total : null}
          problem={problem}
          busy={busy}
          send={send}
          label={`lock for ${members.length} wallet${members.length === 1 ? '' : 's'}`}
          action={create}
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">{BUFFER_NOTE}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- list

function MyTeams({ wallet }: { wallet: `0x${string}` }) {
  const { data: ids } = useTeamBatchesOf(wallet);
  if (!ids?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">your team vestings</h2>
      <ul className="divide-y divide-border border border-border">
        {ids.map((id) => (
          <TeamRow key={id} id={id} />
        ))}
      </ul>
    </section>
  );
}

function TeamRow({ id }: { id: number }) {
  const { data: team } = useTeamBatch(id);
  return (
    <li>
      <Link to={`/team/${id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-xs hover:bg-muted transition-colors">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium truncate">{team?.label || 'team vesting'}</p>
          <p className="text-muted-foreground">
            {team ? `${team.vaults.length} wallet${team.vaults.length === 1 ? '' : 's'} · ${format(team.createdAt * 1000, 'MMM d, yyyy')}` : '…'}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function MyVaults({ wallet }: { wallet: `0x${string}` }) {
  const { data: vaults, isLoading } = useTimelockVaults(wallet);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">your timed locks</h2>
      {isLoading ? (
        <div className="h-16 border border-border bg-muted/30 animate-pulse" />
      ) : !vaults?.length ? (
        <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">no timed locks yet</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {vaults.map((v) => (
            <VaultRow key={v} vault={v} />
          ))}
        </ul>
      )}
    </section>
  );
}

function VaultRow({ vault }: { vault: `0x${string}` }) {
  const { data: v } = useVault(vault);
  const now = Math.floor(Date.now() / 1000);
  const unlockedPct = v && v.total > 0n ? Number(((v.total - v.stillLocked) * 1000n) / v.total) / 10 : 0;
  const next = v ? nextUnlockAt(v.schedule, now) : null;
  const secondsLeft = useSecondsUntil(next && next > now ? next : null);
  return (
    <li>
      <Link to={`/vault/${vault}`} className="flex items-center justify-between gap-3 px-4 py-3 text-xs hover:bg-muted transition-colors">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium truncate">
            {v ? `${Number(formatUnits(v.total, v.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${v.symbol}` : '…'}
            {v?.isLP && <span className="font-mono text-[10px] text-muted-foreground"> · lp</span>}
          </p>
          <p className="text-muted-foreground truncate">
            {v
              ? fullyUnlockedAt(v.schedule) <= now
                ? 'fully unlocked'
                : `${unlockedPct}% unlocked${secondsLeft ? ` · ${v.schedule.kind === 'fixed' ? 'unlocks' : 'next'} in ${formatCountdown(secondsLeft)}` : ''}`
              : ''}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
