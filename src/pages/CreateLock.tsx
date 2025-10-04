import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useLPLocker, useWaitForTransaction } from '@/hooks/web3/useLPLocker';
import { useERC20, useTokenBalance, useTokenAllowance, useTokenMetadata } from '@/hooks/web3/useERC20';
import { CONTRACTS } from '@/lib/web3/constants';
import { formatTokenAmount } from '@/lib/web3/utils';

export default function CreateLock() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [lpTokenAddress, setLpTokenAddress] = useState<`0x${string}` | ''>('');
  const [amount, setAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const validAddress = lpTokenAddress && isAddress(lpTokenAddress) ? lpTokenAddress : undefined;
  const { data: tokenMetadata } = useTokenMetadata(validAddress);
  const { data: balance, refetch: refetchBalance } = useTokenBalance(validAddress);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(validAddress, CONTRACTS.LP_LOCKER);
  const { approve } = useERC20(validAddress);
  const { lockLiquidity } = useLPLocker();
  const { isSuccess: isTxSuccess } = useWaitForTransaction(txHash);

  const parsedAmount = amount && tokenMetadata ? parseUnits(amount, tokenMetadata.decimals) : 0n;
  const needsApproval = allowance !== undefined && parsedAmount > allowance;

  const handleApprove = async () => {
    if (!validAddress || !parsedAmount) return;
    
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
    if (!validAddress || !parsedAmount) return;

    setIsLocking(true);
    try {
      const hash = await lockLiquidity(validAddress, parsedAmount);
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
            <p className="text-xs text-muted-foreground">lock aerodrome lp tokens for 30 days</p>
          </div>

          <div className="space-y-4 border border-border p-6">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-xs">lp token address</Label>
              <Input
                id="token"
                placeholder="0x..."
                value={lpTokenAddress}
                onChange={(e) => setLpTokenAddress(e.target.value as `0x${string}`)}
                className="text-xs"
              />
              {tokenMetadata && (
                <p className="text-xs text-muted-foreground">
                  {tokenMetadata.name} ({tokenMetadata.symbol})
                </p>
              )}
            </div>

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
                disabled={isApproving || !validAddress || !parsedAmount}
                className="w-full"
                size="sm"
              >
                {isApproving ? 'approving...' : 'approve'}
              </Button>
            ) : (
              <Button
                onClick={handleLock}
                disabled={isLocking || !validAddress || !parsedAmount}
                className="w-full"
                size="sm"
              >
                {isLocking ? 'locking...' : 'lock liquidity'}
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• 30-day timelock after withdrawal trigger</p>
            <p>• claim lp fees anytime</p>
            <p>• top up locks anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
}
