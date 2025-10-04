import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/web3/WalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSaveDeployedLocker } from '@/hooks/useDeployedLockers';
import { useTokenMetadata } from '@/hooks/web3/useERC20';

export default function DeployLocker() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [lpTokenAddress, setLpTokenAddress] = useState<string>('');
  const [feeReceiverAddress, setFeeReceiverAddress] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const saveLocker = useSaveDeployedLocker();

  const isValidLpAddress = lpTokenAddress.startsWith('0x') && lpTokenAddress.length === 42;
  const isValidFeeAddress = feeReceiverAddress.startsWith('0x') && feeReceiverAddress.length === 42;
  const validLpAddress = isValidLpAddress ? (lpTokenAddress as `0x${string}`) : undefined;
  
  const { data: tokenMetadata } = useTokenMetadata(validLpAddress);

  const handleDeploy = async () => {
    if (!address || !validLpAddress || !isValidFeeAddress) return;

    setIsDeploying(true);
    try {
      // TODO: Replace this with actual factory contract deployment
      // Example: const deployedAddress = await deployLockerContract(validLpAddress, feeReceiverAddress);
      
      // Mock deployment for now - YOU NEED TO IMPLEMENT ACTUAL FACTORY DEPLOYMENT
      const mockDeployedAddress = '0x' + Math.random().toString(16).slice(2, 42);
      
      toast({ description: 'deploying locker contract...' });
      
      // Simulate deployment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save to database
      await saveLocker.mutateAsync({
        locker_address: mockDeployedAddress,
        lp_token_address: lpTokenAddress,
        fee_receiver_address: feeReceiverAddress,
        deployment_tx_hash: '0x' + Math.random().toString(16).slice(2),
      });

      toast({ description: 'locker deployed successfully!' });
      navigate('/lockers');
    } catch (error: any) {
      toast({ description: error.message || 'deployment failed', variant: 'destructive' });
    } finally {
      setIsDeploying(false);
    }
  };

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

          <div className="space-y-4 border border-border p-6">
            <div className="space-y-2">
              <Label htmlFor="lpToken" className="text-xs">aerodrome lp token address</Label>
              <Input
                id="lpToken"
                type="text"
                placeholder="0x..."
                value={lpTokenAddress}
                onChange={(e) => setLpTokenAddress(e.target.value)}
                className="text-xs font-mono"
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
              />
              <p className="text-[10px] text-muted-foreground">
                address that will receive claimed lp fees (usually your wallet)
              </p>
            </div>

            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !isValidLpAddress || !isValidFeeAddress}
              className="w-full"
              size="sm"
            >
              {isDeploying ? 'deploying...' : 'deploy locker'}
            </Button>
          </div>

          <div className="border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
              ⚠️ <strong>developer note:</strong> this currently uses mock deployment. 
              you need to implement actual factory contract deployment in handleDeploy().
            </p>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• each locker is a separate contract instance</p>
            <p>• you control the locker as the owner</p>
            <p>• after deployment, you can create locks in this locker</p>
          </div>
        </div>
      </div>
    </div>
  );
}
