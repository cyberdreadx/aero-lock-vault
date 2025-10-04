import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useLPLocker, useWaitForTransaction } from '@/hooks/web3/useLPLocker';
import { useERC20, useTokenBalance, useTokenAllowance, useTokenMetadata } from '@/hooks/web3/useERC20';
import { CONTRACTS } from '@/lib/web3/constants';
import { LPLockerABI } from '@/lib/web3/abis/LPLockerABI';
import { formatTokenAmount } from '@/lib/web3/utils';
import { Check, AlertCircle } from 'lucide-react';

export default function CreateLock() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Get the LP token from the locker contract
  const { data: lpTokenAddress } = useReadContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LPLockerABI,
    functionName: 'tokenContract',
  }) as { data: `0x${string}` | undefined };

  const { data: tokenMetadata } = useTokenMetadata(lpTokenAddress);
  const { data: balance, refetch: refetchBalance } = useTokenBalance(lpTokenAddress);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(lpTokenAddress, CONTRACTS.LP_LOCKER);
  const { approve } = useERC20(lpTokenAddress);
  const { lockLiquidity } = useLPLocker();
  const { isSuccess: isTxSuccess } = useWaitForTransaction(txHash);

  const parsedAmount = amount && tokenMetadata ? parseUnits(amount, tokenMetadata.decimals) : 0n;
  const needsApproval = allowance !== undefined && parsedAmount > allowance;
  const hasBalance = balance !== undefined && balance > 0n;

  const handleApprove = async () => {
    if (!lpTokenAddress || !parsedAmount) return;
    
    setIsApproving(true);
    try {
      const hash = await approve(CONTRACTS.LP_LOCKER, parsedAmount);
      toast({ description: 'approval submitted' });
      await refetchAllowance();
      toast({ description: 'approved' });
    } catch (error: any) {
      toast({ description: error.message || 'approval failed', variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleLock = async () => {
    if (!parsedAmount) return;

    setIsLocking(true);
    try {
      const hash = await lockLiquidity(parsedAmount);
      setTxHash(hash);
      toast({ description: 'lock created' });
      await refetchBalance();
      navigate('/app');
    } catch (error: any) {
      toast({ description: error.message || 'lock failed', variant: 'destructive' });
    } finally {
      setIsLocking(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-sm tracking-tight">connect wallet to create lock</h1>
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
          <Link to="/app">
            <Button variant="ghost" size="sm">
              dashboard
            </Button>
          </Link>
          <WalletButton />
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-sm tracking-tight mb-1">create lock</h1>
            <p className="text-xs text-muted-foreground">tokens locked indefinitely. 30-day exit countdown when you trigger withdrawal.</p>
          </div>

          <div className="space-y-4 border border-border p-6">
            {lpTokenAddress && tokenMetadata && (
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">accepted lp token</p>
                  {hasBalance && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                      <Check className="h-3 w-3" /> found in wallet
                    </span>
                  )}
                  {!hasBalance && balance !== undefined && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" /> not in wallet
                    </span>
                  )}
                </div>
                
                <div className="bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">symbol</span>
                    <span className="text-xs font-medium">{tokenMetadata.symbol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">name</span>
                    <span className="text-xs font-medium">{tokenMetadata.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">address</span>
                    <span className="text-[10px] font-mono">{lpTokenAddress.slice(0, 8)}...{lpTokenAddress.slice(-6)}</span>
                  </div>
                </div>

                {!hasBalance && balance !== undefined && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      you don't have this lp token. acquire it from aerodrome first.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs">amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs"
              />
              {balance !== undefined && tokenMetadata && (
                <p className="text-xs text-muted-foreground">
                  balance: {formatTokenAmount(balance, tokenMetadata.decimals)}
                </p>
              )}
            </div>

            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={isApproving || !lpTokenAddress || !parsedAmount}
                className="w-full"
                size="sm"
              >
                {isApproving ? 'approving...' : 'approve'}
              </Button>
            ) : (
              <Button
                onClick={handleLock}
                disabled={isLocking || !lpTokenAddress || !parsedAmount}
                className="w-full"
                size="sm"
              >
                {isLocking ? 'locking...' : 'lock liquidity'}
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• tokens locked indefinitely until you trigger withdrawal</p>
            <p>• once triggered: mandatory 30-day countdown (cancellable)</p>
            <p>• claim fees & top up anytime while locked</p>
          </div>
        </div>
      </div>
    </div>
  );
}
