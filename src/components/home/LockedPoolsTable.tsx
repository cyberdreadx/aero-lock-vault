import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { Button } from '@/components/ui/button';
import { useTokenMetadata } from '@/hooks/web3/useERC20';
import { useLockerBalance } from '@/hooks/web3/useLPLocker';
import { useGetAllLockIds } from '@/hooks/web3/useLPLocker';
import { formatTokenAmount } from '@/lib/web3/utils';
import { ExternalLink } from 'lucide-react';

interface LockedPool {
  locker_address: string;
  lp_token_address: string;
  deployed_at: string;
}

interface LockedPoolsTableProps {
  pools: LockedPool[];
}

function PoolRow({ pool }: { pool: LockedPool }) {
  const lockerAddress = pool.locker_address as `0x${string}`;
  const lpTokenAddress = pool.lp_token_address as `0x${string}`;

  const { data: balance } = useLockerBalance(lockerAddress);
  const { data: lockIds } = useGetAllLockIds(lockerAddress);
  const { data: tokenMetadata } = useTokenMetadata(lpTokenAddress);

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <AddressDisplay address={lpTokenAddress} showLink={false} />
          {tokenMetadata && (
            <span className="text-xs text-muted-foreground">
              ({tokenMetadata.symbol})
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-xs">
        {balance !== undefined && tokenMetadata
          ? `${formatTokenAmount(balance, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
          : '...'}
      </td>
      <td className="py-3 px-4 text-xs">
        {lockIds?.length || 0}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(pool.deployed_at), { addSuffix: true })}
      </td>
      <td className="py-3 px-4">
        <Link to={`/locker/${pool.locker_address}`}>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            view <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}

export function LockedPoolsTable({ pools }: LockedPoolsTableProps) {
  if (pools.length === 0) {
    return (
      <div className="border border-border p-8 text-center">
        <p className="text-xs text-muted-foreground">no locked pools yet</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          be the first to deploy a locker
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr className="border-b border-border">
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                lp token
              </th>
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                locked balance
              </th>
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                locks
              </th>
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                deployed
              </th>
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                actions
              </th>
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
