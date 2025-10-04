import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount, useWaitForTransactionReceipt, useDeployContract, useSendTransaction } from 'wagmi';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSaveDeployedLocker } from '@/hooks/useDeployedLockers';
import { useTokenMetadata, useTokenBalance } from '@/hooks/web3/useERC20';
import { useEthPrice, calculateEthAmount } from '@/hooks/useEthPrice';
import { formatUnits, parseEther } from 'viem';
import { LP_LOCKER_BYTECODE, LP_LOCKER_CONSTRUCTOR_ABI } from '@/lib/web3/LPLockerBytecode';
import { DEPLOYMENT_FEE_USD, TREASURY_ADDRESS } from '@/lib/web3/constants';
import { CheckCircle2 } from 'lucide-react';

export default function DeployLocker() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [lpTokenAddress, setLpTokenAddress] = useState<string>('');
  const [feeReceiverAddress, setFeeReceiverAddress] = useState<string>('');
  const [hasPaidFee, setHasPaidFee] = useState(false);
  
  const saveLocker = useSaveDeployedLocker();
  
  // Payment transaction
  const { sendTransaction: sendPayment, data: paymentHash, isPending: isPaymentPending } = useSendTransaction();
  const { isLoading: isPaymentConfirming, isSuccess: isPaymentSuccess } = useWaitForTransactionReceipt({ 
    hash: paymentHash 
  });
  
  // Deployment transaction
  const { deployContract, data: deployHash, isPending: isDeployPending } = useDeployContract();
  const { isLoading: isDeployConfirming, isSuccess: isDeploySuccess, data: receipt } = useWaitForTransactionReceipt({ 
    hash: deployHash 
  });

  const isValidLpAddress = lpTokenAddress.startsWith('0x') && lpTokenAddress.length === 42;
  const isValidFeeAddress = feeReceiverAddress.startsWith('0x') && feeReceiverAddress.length === 42;
  const validLpAddress = isValidLpAddress ? (lpTokenAddress as `0x${string}`) : undefined;
  
  const { data: tokenMetadata } = useTokenMetadata(validLpAddress);
  const { data: tokenBalance } = useTokenBalance(validLpAddress);
  const { data: ethPrice, isLoading: isPriceLoading } = useEthPrice();
  
  const deploymentFeeEth = ethPrice ? calculateEthAmount(DEPLOYMENT_FEE_USD, ethPrice) : '0';

  const handlePayFee = async () => {
    if (!address) return;

    try {
      toast({ description: 'sending deployment fee...' });
      
      sendPayment({
        to: TREASURY_ADDRESS as `0x${string}`,
        value: parseEther(deploymentFeeEth),
      });
    } catch (error: any) {
      toast({ description: error.message || 'payment failed', variant: 'destructive' });
    }
  };

  const handleDeploy = async () => {
    if (!address || !validLpAddress || !isValidFeeAddress) return;

    try {
      toast({ description: 'deploying locker contract...' });
      
      deployContract({
        abi: LP_LOCKER_CONSTRUCTOR_ABI,
        bytecode: LP_LOCKER_BYTECODE,
        args: [validLpAddress, address, feeReceiverAddress as `0x${string}`],
      });
    } catch (error: any) {
      toast({ description: error.message || 'deployment failed', variant: 'destructive' });
    }
  };

  // Handle successful payment
  useEffect(() => {
    if (isPaymentSuccess && paymentHash) {
      setHasPaidFee(true);
      toast({ description: 'payment confirmed! you can now deploy your locker' });
    }
  }, [isPaymentSuccess, paymentHash]);

  // Handle successful deployment
  useEffect(() => {
    if (isDeploySuccess && deployHash && receipt?.contractAddress) {
      saveLocker.mutate({
        locker_address: receipt.contractAddress,
        lp_token_address: lpTokenAddress,
        fee_receiver_address: feeReceiverAddress,
        deployment_tx_hash: deployHash,
      }, {
        onSuccess: () => {
          toast({ description: 'locker deployed successfully!' });
          navigate('/lockers');
        },
        onError: (error) => {
          console.error('Failed to save locker:', error);
          toast({ description: 'locker deployed but failed to save', variant: 'destructive' });
          navigate('/lockers');
        }
      });
    }
  }, [isDeploySuccess, deployHash, receipt, lpTokenAddress, feeReceiverAddress, saveLocker, navigate]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-sm tracking-tight">connect wallet to deploy locker</h1>
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
          <Link to="/lockers">
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
              <h1 className="text-sm tracking-tight mb-1">deploy lp locker</h1>
              <p className="text-xs text-muted-foreground">
                deploy your own locker contract for any aerodrome lp token
              </p>
            </div>

            {/* Step 1: Payment */}
            <div className="border border-border p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  hasPaidFee ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {hasPaidFee ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xs font-medium mb-1">pay deployment fee</h2>
                  <p className="text-[10px] text-muted-foreground">
                    one-time fee of ${DEPLOYMENT_FEE_USD} ({isPriceLoading ? '...' : `${deploymentFeeEth} ETH`}) to deploy your locker contract
                  </p>
                </div>
              </div>

              {!hasPaidFee && (
                <div className="pl-9">
                  <Button
                    onClick={handlePayFee}
                    disabled={isPaymentPending || isPaymentConfirming || isPriceLoading || !ethPrice}
                    size="sm"
                  >
                    {isPaymentPending || isPaymentConfirming 
                      ? 'processing payment...' 
                      : isPriceLoading 
                      ? 'loading price...'
                      : `pay $${DEPLOYMENT_FEE_USD} (${deploymentFeeEth} ETH)`}
                  </Button>
                </div>
              )}

              {hasPaidFee && (
                <div className="pl-9 text-xs text-green-600 dark:text-green-400">
                  ✓ payment confirmed
                </div>
              )}
            </div>

            {/* Step 2: Configuration */}
            <div className={`border border-border p-6 ${!hasPaidFee ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  hasPaidFee ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
                <div className="flex-1">
                  <h2 className="text-xs font-medium mb-1">configure locker</h2>
                  <p className="text-[10px] text-muted-foreground">
                    set up your locker parameters
                  </p>
                </div>
              </div>

              <div className="pl-9 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lpToken" className="text-xs">aerodrome lp token address</Label>
                  <Input
                    id="lpToken"
                    type="text"
                    placeholder="0x..."
                    value={lpTokenAddress}
                    onChange={(e) => setLpTokenAddress(e.target.value)}
                    className="text-xs font-mono"
                    disabled={!hasPaidFee}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    the lp token that will be locked in this contract
                  </p>
                </div>

                {isValidLpAddress && tokenMetadata && (
                  <div className="bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium">token detected</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">symbol</span>
                      <span className="text-xs font-medium">{tokenMetadata.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">name</span>
                      <span className="text-xs font-medium">{tokenMetadata.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">your balance</span>
                      <span className="text-xs font-medium">
                        {tokenBalance !== undefined 
                          ? formatUnits(tokenBalance, tokenMetadata.decimals)
                          : '...'} {tokenMetadata.symbol}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="feeReceiver" className="text-xs">fee receiver address</Label>
                  <Input
                    id="feeReceiver"
                    type="text"
                    placeholder="0x..."
                    value={feeReceiverAddress}
                    onChange={(e) => setFeeReceiverAddress(e.target.value)}
                    className="text-xs font-mono"
                    disabled={!hasPaidFee}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    address that will receive claimed lp fees (usually your wallet)
                  </p>
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={!hasPaidFee || isDeployPending || isDeployConfirming || !isValidLpAddress || !isValidFeeAddress}
                  className="w-full"
                  size="sm"
                >
                  {isDeployPending || isDeployConfirming ? 'deploying...' : 'deploy locker'}
                </Button>
              </div>
            </div>

            <div className="border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
                ℹ️ <strong>note:</strong> you must pay the deployment fee before configuring your locker.
                the fee helps maintain the platform and covers infrastructure costs.
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• deployment fee: ${DEPLOYMENT_FEE_USD} (~{deploymentFeeEth} ETH, one-time payment)</p>
              <p>• each locker is a separate contract instance</p>
              <p>• you control the locker as the owner</p>
              <p>• after deployment, you can create locks in this locker</p>
            </div>
          </div>
      </div>
    </div>
  );
}
