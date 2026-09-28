import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  concat,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  isAddress,
  parseAbi,
  parseUnits,
} from 'viem';
import { addDays, format } from 'date-fns';
import { AlertTriangle, ArrowRight, CalendarClock, Hourglass, Layers, Rocket } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
import { VestingChart } from '@/components/web3/VestingChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useEthPrice } from '@/hooks/useEthPrice';
import { useLpPositions } from '@/hooks/web3/useLpPositions';
import { useWalletTokens } from '@/hooks/web3/useWalletTokens';
import { useBaseTx } from '@/hooks/web3/useBaseTx';
import { useTimelockFactoryDeployed, useTimelockFee, useTimelockVaults, useVault } from '@/hooks/web3/useTimelock';
import { baseClient, multicallRead } from '@/lib/web3/baseReads';
import { AERODROME, canUseTimelocks, isAdminWallet } from '@/lib/web3/constants';
import { txErrorMessage } from '@/lib/web3/txError';
import {
  TIMELOCK_CREATE2_DEPLOYER,
  TIMELOCK_FACTORY_ABI,
  TIMELOCK_FACTORY_ADDRESS,
  TIMELOCK_FACTORY_INITCODE,
  TIMELOCK_FACTORY_SALT,
} from '@/lib/web3/timelock/artifacts';
import {
  DAY,
  KIND_INDEX,
  describeSchedule,
  fullyUnlockedAt,
  type Schedule,
  type ScheduleKind,
} from '@/lib/web3/timelock/schedule';
import { cn } from '@/lib/utils';

const FACTORY = TIMELOCK_FACTORY_ADDRESS as `0x${string}`;
const MAX_SPAN = 100 * 365 * DAY;
// the contract refunds anything above the fee; this absorbs price moves while signing
const FEE_BUFFER_PERCENT = 3n;
const POOL_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);
const fmtDate = (t: number) => format(t * 1000, 'MMM d, yyyy');

interface Asset {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  balance: bigint;
  isLP: boolean;
}

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
                  <CreateLock wallet={address} />
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
        <p>fee: $150 per lock, priced live with chainlink. you can change it later.</p>
      </div>
      <Button className="w-full sm:w-auto text-xs" disabled={!canDeploy || !!busy} onClick={deploy}>
        {busy ? 'deploying...' : 'deploy contract'}
      </Button>
    </section>
  );
}

// ----------------------------------------------------------------- create

function useAllowance(token?: `0x${string}`, owner?: `0x${string}`) {
  return useQuery({
    queryKey: ['allowance', token, owner, FACTORY],
    enabled: !!token && !!owner,
    queryFn: async () => {
      const res = await baseClient.call({
        to: token!,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'allowance', args: [owner!, FACTORY] }),
      });
      return decodeFunctionResult({ abi: erc20Abi, functionName: 'allowance', data: res.data! });
    },
  });
}

async function readAsset(token: `0x${string}`, wallet: `0x${string}`): Promise<Asset | null> {
  const r = await multicallRead([
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'symbol' }) },
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'decimals' }) },
    { target: token, callData: encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }) },
    { target: AERODROME.FACTORY as `0x${string}`, callData: encodeFunctionData({ abi: POOL_ABI, functionName: 'isPool', args: [token] }) },
  ]);
  if (!r[1] || !r[2]) return null;
  return {
    address: token,
    symbol: r[0] ? decodeFunctionResult({ abi: erc20Abi, functionName: 'symbol', data: r[0] }) : '???',
    decimals: decodeFunctionResult({ abi: erc20Abi, functionName: 'decimals', data: r[1] }),
    balance: decodeFunctionResult({ abi: erc20Abi, functionName: 'balanceOf', data: r[2] }),
    isLP: r[3] ? decodeFunctionResult({ abi: POOL_ABI, functionName: 'isPool', data: r[3] }) : false,
  };
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

function CreateLock({ wallet }: { wallet: `0x${string}` }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send, busy } = useBaseTx();
  const { positions: lps } = useLpPositions(wallet);
  const { tokens } = useWalletTokens(wallet, true);
  const { data: fee } = useTimelockFee(wallet);
  const { data: ethPrice } = useEthPrice();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [pasted, setPasted] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<ScheduleKind>('fixed');
  const [unlockDate, setUnlockDate] = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'));
  const [cliffDays, setCliffDays] = useState(90);
  const [vestDays, setVestDays] = useState(365);
  const [steps, setSteps] = useState(12);
  const [stepDays, setStepDays] = useState(30);
  const [beneficiary, setBeneficiary] = useState('');

  // a pasted contract address loads that token
  useEffect(() => {
    const a = pasted.trim();
    if (!isAddress(a, { strict: false })) return;
    readAsset(a as `0x${string}`, wallet).then((found) => {
      if (found) setAsset(found);
      else toast({ description: "that address isn't a token on base", variant: 'destructive' });
    });
  }, [pasted, wallet]);

  const options: Asset[] = useMemo(
    () => [
      ...(lps ?? []).map((p) => ({ address: p.address, symbol: p.symbol, decimals: p.decimals, balance: p.balance, isLP: true })),
      ...(tokens ?? []).map((t) => ({ address: t.address, symbol: t.symbol, decimals: t.decimals, balance: t.balance, isLP: false })),
    ],
    [lps, tokens],
  );

  const now = Math.floor(Date.now() / 1000);
  const unlockTime = Math.floor(new Date(`${unlockDate}T00:00`).getTime() / 1000);
  const schedule: Schedule = {
    kind,
    start: now,
    cliff: kind === 'fixed' ? unlockTime : kind === 'cliffLinear' ? now + cliffDays * DAY : 0,
    duration: kind === 'cliffLinear' ? vestDays * DAY : kind === 'steps' ? stepDays * DAY : 0,
    steps: kind === 'steps' ? steps : 0,
  };

  let amountWei: bigint | null = null;
  try {
    amountWei = asset && amount ? parseUnits(amount, asset.decimals) : null;
  } catch {
    amountWei = null;
  }
  const owner = (beneficiary.trim() || wallet) as `0x${string}`;

  const problem = !asset
    ? 'pick a token or lp'
    : !amountWei || amountWei <= 0n
      ? 'enter an amount'
      : amountWei > asset.balance
        ? `you only have ${formatUnits(asset.balance, asset.decimals)} ${asset.symbol}`
        : !isAddress(owner, { strict: false })
          ? 'beneficiary must be a wallet address'
          : kind === 'fixed' && !(unlockTime > now && unlockTime - now <= MAX_SPAN)
            ? 'pick an unlock date in the future'
            : kind === 'cliffLinear' && !(vestDays > 0 && cliffDays >= 0 && (cliffDays + vestDays) * DAY <= MAX_SPAN)
              ? 'unlock length must be at least a day'
              : kind === 'steps' && !(steps >= 1 && steps <= 1000 && stepDays > 0 && steps * stepDays * DAY <= MAX_SPAN)
                ? 'steps must be between 1 and 1000'
                : fee === undefined
                  ? 'loading the fee...'
                  : null;

  const { data: allowance, refetch: refetchAllowance } = useAllowance(asset?.address, wallet);
  const needsApproval = !!amountWei && (allowance ?? 0n) < amountWei;

  const approve = async () => {
    try {
      await send('approving', {
        to: asset!.address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [FACTORY, amountWei!] }),
      });
      await refetchAllowance();
    } catch (e) {
      toast({ description: txErrorMessage(e, 'approval failed'), variant: 'destructive' });
    }
  };

  const create = async () => {
    try {
      const receipt = await send('locking', {
        to: FACTORY,
        value: fee! + (fee! * FEE_BUFFER_PERCENT) / 100n,
        data: encodeFunctionData({
          abi: TIMELOCK_FACTORY_ABI,
          functionName: 'createLock',
          args: [
            {
              token: asset!.address,
              amount: amountWei!,
              owner,
              feeReceiver: owner,
              kind: KIND_INDEX[kind],
              unlockTime: BigInt(kind === 'fixed' ? unlockTime : 0),
              cliffDuration: BigInt(kind === 'cliffLinear' ? cliffDays * DAY : 0),
              duration: BigInt(schedule.duration),
              steps: kind === 'steps' ? steps : 0,
            },
          ],
        }),
      });
      let vault: string | undefined;
      for (const log of receipt.logs as unknown as { address: string; data: `0x${string}`; topics: [`0x${string}`, ...`0x${string}`[]] }[]) {
        if (log.address.toLowerCase() !== FACTORY.toLowerCase()) continue;
        try {
          const event = decodeEventLog({ abi: TIMELOCK_FACTORY_ABI, data: log.data, topics: log.topics }) as {
            eventName: string;
            args: unknown;
          };
          if (event.eventName === 'LockCreated') vault = (event.args as { vault: string }).vault;
        } catch {
          // another event
        }
      }
      toast({ description: 'locked 🔒' });
      queryClient.invalidateQueries({ queryKey: ['timelock-vaults'] });
      if (vault) navigate(`/vault/${vault}`);
    } catch (e) {
      toast({ description: txErrorMessage(e, 'lock failed'), variant: 'destructive' });
    }
  };

  const feeUsd = fee !== undefined && ethPrice ? Number(formatEther(fee)) * ethPrice : null;

  return (
    <section className="border border-border bg-card p-4 sm:p-5 space-y-6">
      <h2 className="text-sm font-semibold tracking-tight">new timed lock</h2>

      {/* asset */}
      <div className="space-y-2">
        <Label className="text-xs">what to lock</Label>
        <div className="max-h-56 overflow-y-auto border border-border divide-y divide-border">
          {options.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">no tokens found - paste a contract address below</p>}
          {options.map((o) => (
            <button
              key={o.address}
              type="button"
              onClick={() => {
                setAsset(o);
                setAmount('');
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors',
                asset?.address === o.address ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              <span className="truncate font-medium">
                {o.symbol} {o.isLP && <span className="font-mono text-[10px] opacity-70">· lp</span>}
              </span>
              <span className="font-mono shrink-0 opacity-80">
                {Number(formatUnits(o.balance, o.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </button>
          ))}
        </div>
        <Input
          placeholder="or paste a token / lp address 0x…"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          className="font-mono text-base sm:text-xs"
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

      {/* schedule */}
      <div className="space-y-3">
        <Label className="text-xs">unlock schedule</Label>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map(({ kind: k, label, hint, icon: Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'border p-2.5 text-left space-y-1 transition-colors',
                k === kind ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <p className="text-[11px] font-medium leading-tight">{label}</p>
              <p className="hidden sm:block text-[10px] opacity-70 leading-tight">{hint}</p>
            </button>
          ))}
        </div>

        {kind === 'fixed' && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">unlock date - you can push it later afterwards, never earlier</p>
            <Input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} className="text-base sm:text-sm w-full sm:w-56" />
          </div>
        )}
        {kind === 'cliffLinear' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">cliff - nothing unlocks before</p>
              <Chips values={[0, 30, 90, 180, 365]} value={cliffDays} onChange={setCliffDays} unit={(d) => (d === 0 ? 'none' : `${d}d`)} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">then unlocks gradually over</p>
              <Chips values={[30, 90, 180, 365, 730]} value={vestDays} onChange={setVestDays} unit={(d) => (d >= 365 ? `${d / 365}y` : `${d}d`)} />
            </div>
          </div>
        )}
        {kind === 'steps' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">number of equal parts</p>
              <Chips values={[3, 6, 12, 24, 36]} value={steps} onChange={setSteps} unit={(n) => `${n}`} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">one part every</p>
              <Chips values={[7, 14, 30, 90]} value={stepDays} onChange={setStepDays} unit={(d) => (d === 30 ? 'month' : d === 90 ? 'quarter' : `${d}d`)} />
            </div>
          </div>
        )}

        {(kind !== 'fixed' || unlockTime > now) && (
          <div className="border border-border p-3 space-y-2">
            <p className="text-xs">{describeSchedule(schedule, fmtDate)}</p>
            <VestingChart schedule={schedule} total={amountWei ?? undefined} decimals={asset?.decimals} symbol={asset?.symbol} />
          </div>
        )}
      </div>

      {/* beneficiary */}
      <div className="space-y-2">
        <Label className="text-xs">who receives it <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder={`you (${wallet.slice(0, 6)}…${wallet.slice(-4)}) - or a team member / investor wallet`}
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          className="font-mono text-base sm:text-xs"
        />
      </div>

      {/* pay */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">fee</span>
          <span className="font-mono">
            {fee === undefined ? '…' : fee === 0n ? 'free' : `${Number(formatEther(fee)).toFixed(5)} ETH`}
            {feeUsd !== null && fee !== 0n && <span className="text-muted-foreground"> ≈ ${feeUsd.toFixed(0)}</span>}
          </span>
        </div>
        {problem ? (
          <Button className="w-full text-xs" disabled>
            {problem}
          </Button>
        ) : needsApproval ? (
          <Button className="w-full text-xs" disabled={!!busy} onClick={approve}>
            {busy === 'approving' ? 'approving...' : `1/2 · approve ${asset!.symbol}`}
          </Button>
        ) : (
          <Button className="w-full text-xs" disabled={!!busy} onClick={create}>
            {busy === 'locking' ? 'locking...' : `lock ${amount} ${asset!.symbol}`}
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          a few % extra ETH is sent to cover price moves while you sign; the contract refunds everything above the fee in the same transaction.
        </p>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- list

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
  return (
    <li>
      <Link to={`/vault/${vault}`} className="flex items-center justify-between gap-3 px-4 py-3 text-xs hover:bg-muted transition-colors">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium truncate">
            {v ? `${Number(formatUnits(v.total, v.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${v.symbol}` : '…'}
            {v?.isLP && <span className="font-mono text-[10px] text-muted-foreground"> · lp</span>}
          </p>
          <p className="text-muted-foreground truncate">
            {v ? (fullyUnlockedAt(v.schedule) <= now ? 'fully unlocked' : `${unlockedPct}% unlocked · done ${fmtDate(fullyUnlockedAt(v.schedule))}`) : ''}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
