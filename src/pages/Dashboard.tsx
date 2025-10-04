import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/web3/WalletButton';
import { useUserLocks } from '@/hooks/web3/useUserLocks';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/web3/AddressDisplay';
import { formatTokenAmount, getLockStatus, calculateUnlockDate, getTimeRemaining } from '@/lib/web3/utils';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { locks, isLoading } = useUserLocks();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-sm tracking-tight">connect wallet to view locks</h1>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xs tracking-tight font-medium">
          aerolock
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/deploy">
            <Button variant="outline" size="sm">
              create lock
            </Button>
          </Link>
          <WalletButton />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-sm tracking-tight mb-1">your locks</h1>
            <p className="text-xs text-muted-foreground">{address && <AddressDisplay address={address} />}</p>
          </div>

          {isLoading && (
            <div className="text-xs text-muted-foreground">loading locks...</div>
          )}

          {!isLoading && locks.length === 0 && (
            <div className="border border-border p-8 text-center space-y-4">
              <p className="text-xs text-muted-foreground">no locks found</p>
              <Link to="/deploy">
                <Button variant="outline" size="sm">
                  create first lock
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && locks.length > 0 && (
            <div className="border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="p-3 font-medium">id</th>
                    <th className="p-3 font-medium">lp token</th>
                    <th className="p-3 font-medium">amount</th>
                    <th className="p-3 font-medium">status</th>
                    <th className="p-3 font-medium">unlock</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {locks.map((lock) => {
                    const status = getLockStatus(lock);
                    const unlockDate = calculateUnlockDate(lock.lockUpEndTime);
                    const timeRemaining = getTimeRemaining(unlockDate);

                    return (
                      <tr key={lock.lockId} className="border-b border-border last:border-0">
                        <td className="p-3">{lock.lockId.slice(0, 10)}...</td>
                        <td className="p-3">
                          <AddressDisplay address={lock.tokenContract} showLink={false} />
                        </td>
                        <td className="p-3">{formatTokenAmount(lock.amount)}</td>
                        <td className="p-3">
                          <span className={
                            status === 'active' ? 'text-foreground' :
                            status === 'triggered' ? 'text-muted-foreground' :
                            status === 'unlocked' ? 'text-foreground' : 'text-muted-foreground'
                          }>
                            {status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{timeRemaining}</td>
                        <td className="p-3">
                          <Link to={`/locker/${lock.lockId}`}>
                            <Button variant="ghost" size="sm">
                              manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
