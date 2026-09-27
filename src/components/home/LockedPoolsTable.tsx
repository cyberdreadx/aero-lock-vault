import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { Button } from '@/components/ui/button';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { useLockerBalance } from '@/hooks/web3/useLPLocker';
import { useGetAllLockIds } from '@/hooks/web3/useLPLocker';
import { formatTokenAmount } from '@/lib/web3/utils';
import { ArrowUpRight, Lock } from 'lucide-react';

interface LockedPool {
  locker_address: string;
  lp_token_address: string;
  deployed_at: string;
}

interface LockedPoolsTableProps {
  pools: LockedPool[];
}

function usePoolData(pool: LockedPool) {
  const lockerAddress = pool.locker_address as `0x${string}`;
  const lpTokenAddress = pool.lp_token_address as `0x${string}`;

  const { data: balance } = useLockerBalance(lockerAddress);
  const { data: lockIds } = useGetAllLockIds(lockerAddress);
  const { data: tokenMetadata } = useTokenMetadata(lpTokenAddress);

  return {
    lpTokenAddress,
    symbol: tokenMetadata?.symbol,
    balance:
      balance !== undefined && tokenMetadata
        ? formatTokenAmount(balance, tokenMetadata.decimals)
        : undefined,
    locks: lockIds?.length || 0,
    deployed: formatDistanceToNow(new Date(pool.deployed_at), { addSuffix: true }),
  };
}

function PoolRow({ pool }: { pool: LockedPool }) {
  const d = usePoolData(pool);

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <AddressDisplay address={d.lpTokenAddress} showLink={false} />
          {d.symbol && <span className="text-xs text-muted-foreground">({d.symbol})</span>}
        </div>
      </td>
      <td className="py-3 px-4 text-xs font-mono tabular whitespace-nowrap">
        {d.balance !== undefined ? `${d.balance} ${d.symbol}` : '...'}
      </td>
      <td className="py-3 px-4 text-xs font-mono tabular">{d.locks}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground">{d.deployed}</td>
      <td className="py-3 px-4 text-right">
        <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
          <Link to={`/locker/${pool.locker_address}`}>
            view <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}

function PoolCard({ pool }: { pool: LockedPool }) {
  const d = usePoolData(pool);

  return (
    <Link
      to={`/locker/${pool.locker_address}`}
      className="block p-4 active:bg-muted/60 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight truncate">{d.symbol ?? '...'}</p>
          <p className="font-mono text-[11px] text-muted-foreground truncate">
            {d.lpTokenAddress.slice(0, 6)}...{d.lpTokenAddress.slice(-4)}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">locked</p>
          <p className="font-mono tabular truncate">{d.balance ?? '...'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">locks</p>
          <p className="font-mono tabular">{d.locks}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">deployed</p>
          <p className="truncate text-muted-foreground">{d.deployed.replace('about ', '')}</p>
        </div>
      </div>
    </Link>
  );
}

export function LockedPoolsTable({ pools }: LockedPoolsTableProps) {
  if (pools.length === 0) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <Lock className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">no locked pools yet</p>
        <p className="text-[10px] text-muted-foreground mt-1">be the first to deploy a locker</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card">
      {/* mobile: stacked cards */}
      <div className="divide-y divide-border lg:hidden">
        {pools.map((pool) => (
          <PoolCard key={pool.locker_address} pool={pool} />
        ))}
      </div>

      {/* desktop: table */}
      <div className="hidden overflow-x-auto lg:block">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr className="border-b border-border">
            {['lp token', 'locked balance', 'locks', 'deployed', ''].map((h, i) => (
              <th
                key={i}
                className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => (
            <PoolRow key={pool.locker_address} pool={pool} />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
