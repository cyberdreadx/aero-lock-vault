import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useDeployContract, useSendTransaction, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { AppHeader } from '@/components/layout/AppHeader';
import { ConnectGate } from '@/components/layout/ConnectGate';
import { PageHeading } from '@/components/layout/PageHeading';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSaveDeployedLocker } from '@/hooks/useDeployedLockers';
import { useTokenMetadata, useTokenBalance } from '@/hooks/web3/useERC20';
import { useEthPrice, calculateEthAmount } from '@/hooks/useEthPrice';
import { concat, encodeDeployData, formatUnits, getContractAddress, isAddress, parseAbi, parseEther, toHex } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { baseClient } from '@/lib/web3/baseReads';
import { useLpPositions } from '@/hooks/web3/useLpPositions';
import { formatTokenAmount } from '@/lib/web3/utils';
import { LP_LOCKER_BYTECODE, LP_LOCKER_CONSTRUCTOR_ABI } from '@/lib/web3/LPLockerBytecode';
import { AERODROME, DEPLOYMENT_FEE_USD, DEPLOYMENT_FEE_ORIGINAL_USD, TREASURY_ADDRESS, isAdminWallet } from '@/lib/web3/constants';
import { Check } from 'lucide-react';
import { AddressDisplay } from '@/components/web3/AddressDisplay';

const AERODROME_FACTORY_ABI = parseAbi(['function isPool(address pool) view returns (bool)']);
// Arachnid's deterministic deployment proxy (calldata = salt ++ initcode), deployed on Base
const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as const;

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center font-mono text-xs font-medium',
        done ? 'bg-success text-success-foreground' : 'bg-foreground text-background',
      )}
    >
      {done ? <Check className="h-4 w-4" /> : n}
    </div>
  );
}

type DeployProgress = {
  paymentHash?: `0x${string}`;
  deployHash?: `0x${string}`;
  /** predicted address for smart-wallet (CREATE2) deploys, which have no receipt.contractAddress */
  lockerAddress?: `0x${string}`;
  lpTokenAddress?: string;
  feeReceiverAddress?: string;
};

// kept per wallet so a page reload (e.g. iOS reloading the tab after a trip to the
// wallet app) doesn't lose a paid fee or an in-flight deployment
const progressKey = (address: string) => `aerolock.deploy.${address.toLowerCase()}`;

function loadProgress(address?: string): DeployProgress {
  if (!address) return {};
  try {
    return JSON.parse(localStorage.getItem(progressKey(address)) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(address: string, patch: DeployProgress | null) {
  try {
    if (patch === null) localStorage.removeItem(progressKey(address));
    else localStorage.setItem(progressKey(address), JSON.stringify({ ...loadProgress(address), ...patch }));
  } catch {
    // storage unavailable (private mode) - progress just won't survive a reload
  }
}

function txErrorMessage(error: unknown, fallback: string): string {
  const e = error as { shortMessage?: string; message?: string; name?: string } | undefined;
  const text = `${e?.name ?? ''} ${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase();
  if (text.includes('user rejected') || text.includes('user denied') || text.includes('rejected the request')) {
    return 'transaction cancelled in your wallet';
  }
  if (text.includes('insufficient funds') || text.includes('exceeds the balance')) {
    return 'not enough ETH on Base to cover this transaction plus gas';
  }
  return e?.shortMessage || e?.message || fallback;
}

export default function DeployLocker() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [lpTokenAddress, setLpTokenAddress] = useState<string>('');
  const [feeReceiverAddress, setFeeReceiverAddress] = useState<string>('');
  const [showManualLp, setShowManualLp] = useState(false);
  const [stored, setStored] = useState<DeployProgress>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const attemptedSave = useRef<string | null>(null);

  const { mutate: saveLocker } = useSaveDeployedLocker();

  // restore progress for this wallet
  useEffect(() => {
    const progress = loadProgress(address);
    setStored(progress);
    if (progress.lpTokenAddress) setLpTokenAddress(progress.lpTokenAddress);
    // fees usually go to the deployer's own wallet
    setFeeReceiverAddress((current) => progress.feeReceiverAddress || current || address || '');
  }, [address]);

  // Payment transaction
  const { sendTransaction: sendPayment, data: sentPaymentHash, isPending: isPaymentPending } = useSendTransaction();
  const paymentHash = sentPaymentHash ?? stored.paymentHash;
  const {
    isLoading: isPaymentConfirming,
    isSuccess: isPaymentSuccess,
    error: paymentReceiptError,
  } = useWaitForTransactionReceipt({ hash: paymentHash, chainId: base.id });

  // Deployment transaction
  const { deployContract, data: sentDeployHash, isPending: isDirectDeployPending } = useDeployContract();
  // smart wallets (e.g. the Base app) can't send contract-creation txs, so they call a CREATE2 deployer
  const { sendTransaction: sendDeployCall, data: sentProxyDeployHash, isPending: isProxyDeployPending } = useSendTransaction();
  const [predictedLocker, setPredictedLocker] = useState<`0x${string}`>();
  const isDeployPending = isDirectDeployPending || isProxyDeployPending;
  const deployHash = sentDeployHash ?? sentProxyDeployHash ?? stored.deployHash;
  const {
    isLoading: isDeployConfirming,
    isSuccess: isDeploySuccess,
    data: receipt,
    error: deployReceiptError,
  } = useWaitForTransactionReceipt({ hash: deployHash, chainId: base.id });

  const deployedLocker = receipt?.contractAddress ?? predictedLocker ?? stored.lockerAddress;

  // wallets with contract code (smart accounts, EIP-7702 upgraded EOAs) can only make calls
  const { data: isSmartWallet } = useQuery({
    queryKey: ['is-smart-wallet', address],
    enabled: !!address,
    staleTime: Infinity,
    queryFn: async () => {
      const code = await baseClient.getCode({ address: address! });
      return !!code && code !== '0x';
    },
  });

  const isAdmin = isAdminWallet(address);
  const hasPaidFee = isPaymentSuccess;
  const feePaid = hasPaidFee || isAdmin;

  const isValidLpAddress = isAddress(lpTokenAddress, { strict: false });
  const isValidFeeAddress = isAddress(feeReceiverAddress, { strict: false });
  const validLpAddress = isValidLpAddress ? (lpTokenAddress as `0x${string}`) : undefined;

  const { data: tokenMetadata } = useTokenMetadata(validLpAddress);
  const {
    positions,
    isLoading: isLoadingPositions,
    isError: isPositionsError,
    refetch: refetchPositions,
  } = useLpPositions(address);
  const { data: isAerodromePool } = useReadContract({
    address: AERODROME.FACTORY as `0x${string}`,
    abi: AERODROME_FACTORY_ABI,
    functionName: 'isPool',
    args: validLpAddress ? [validLpAddress] : undefined,
    chainId: base.id,
    query: { enabled: !!validLpAddress },
  });
  const configReady = !!(isValidLpAddress && isValidFeeAddress && tokenMetadata && isAerodromePool === true);
  const { data: tokenBalance } = useTokenBalance(validLpAddress);
  const { data: ethPrice, isLoading: isPriceLoading, isError: isPriceError, refetch: refetchPrice } = useEthPrice();

  const deploymentFeeEth = ethPrice ? calculateEthAmount(DEPLOYMENT_FEE_USD, ethPrice) : '0';

  // wallets on another network would otherwise send the fee on the wrong chain
  const ensureBase = async () => {
    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id });
    }
  };

  const handlePayFee = async () => {
    if (!address || !ethPrice) return;

    try {
      await ensureBase();
      toast({ description: 'confirm the deployment fee in your wallet...' });
      sendPayment(
        {
          to: TREASURY_ADDRESS as `0x${string}`,
          value: parseEther(deploymentFeeEth),
          chainId: base.id,
        },
        {
          onSuccess: (hash) => saveProgress(address, { paymentHash: hash, lpTokenAddress, feeReceiverAddress }),
          onError: (error) =>
            toast({ description: txErrorMessage(error, 'payment failed'), variant: 'destructive' }),
        },
      );
    } catch (error) {
      toast({ description: txErrorMessage(error, 'could not switch to base'), variant: 'destructive' });
    }
  };

  const handleDeploy = async () => {
    if (!address || !validLpAddress || !isValidFeeAddress) return;

    try {
      await ensureBase();
      toast({ description: 'confirm the deployment in your wallet...' });
      const args = [validLpAddress, address, feeReceiverAddress as `0x${string}`] as const;
      const onError = (error: Error) =>
        toast({ description: txErrorMessage(error, 'deployment failed'), variant: 'destructive' });

      if (isSmartWallet) {
        // the locker's owner is a constructor argument, so deploying via the public
        // CREATE2 deployer still makes this wallet the owner
        const initCode = encodeDeployData({ abi: LP_LOCKER_CONSTRUCTOR_ABI, bytecode: LP_LOCKER_BYTECODE, args });
        const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
        const locker = getContractAddress({ opcode: 'CREATE2', from: CREATE2_DEPLOYER, salt, bytecode: initCode });
        setPredictedLocker(locker);
        sendDeployCall(
          { to: CREATE2_DEPLOYER, data: concat([salt, initCode]), chainId: base.id },
          {
            onSuccess: (hash) =>
              saveProgress(address, { deployHash: hash, lockerAddress: locker, lpTokenAddress, feeReceiverAddress }),
            onError,
          },
        );
        return;
      }

      deployContract(
        {
          abi: LP_LOCKER_CONSTRUCTOR_ABI,
          bytecode: LP_LOCKER_BYTECODE,
          args,
          chainId: base.id,
        },
        {
          onSuccess: (hash) => saveProgress(address, { deployHash: hash, lpTokenAddress, feeReceiverAddress }),
          onError,
        },
      );
    } catch (error) {
      toast({ description: txErrorMessage(error, 'could not switch to base'), variant: 'destructive' });
    }
  };

  // Handle successful payment
  useEffect(() => {
    if (isPaymentSuccess && sentPaymentHash) {
      toast({ description: 'payment confirmed! you can now deploy your locker' });
    }
  }, [isPaymentSuccess, sentPaymentHash]);

  useEffect(() => {
    if (paymentReceiptError) {
      toast({ description: txErrorMessage(paymentReceiptError, 'payment transaction failed'), variant: 'destructive' });
    }
  }, [paymentReceiptError]);

  useEffect(() => {
    if (deployReceiptError) {
      toast({ description: txErrorMessage(deployReceiptError, 'deployment transaction failed'), variant: 'destructive' });
    }
  }, [deployReceiptError]);

  const recordDeployment = useCallback(() => {
    if (!address || !deployHash || !deployedLocker) return;
    const lockerAddress = deployedLocker;
    setSaveStatus('saving');
    setSaveError('');
    saveLocker(
      {
        locker_address: lockerAddress,
        lp_token_address: lpTokenAddress,
        fee_receiver_address: feeReceiverAddress,
        deployment_tx_hash: deployHash,
        payment_tx_hash: paymentHash,
      },
      {
        onSuccess: () => {
          setSaveStatus('saved');
          saveProgress(address, null);
          const shareUrl = `${window.location.origin}/locked/${lockerAddress}`;
          toast({
            title: 'locker deployed successfully!',
            description: `share link copied: ${shareUrl}`,
          });
          navigator.clipboard?.writeText(shareUrl).catch(() => {});
          setTimeout(() => navigate('/lockers'), 2000);
        },
        onError: (error) => {
          console.error('Failed to verify and save locker:', error);
          setSaveStatus('error');
          setSaveError(error.message || 'could not record the locker');
        },
      },
    );
  }, [address, deployHash, deployedLocker, lpTokenAddress, feeReceiverAddress, paymentHash, saveLocker, navigate]);

  // Record the deployment exactly once per deploy transaction
  useEffect(() => {
    if (!isDeploySuccess || !deployHash || !deployedLocker) return;
    if (!paymentHash && !isAdmin) return;
    if (attemptedSave.current === deployHash) return;
    attemptedSave.current = deployHash;
    recordDeployment();
  }, [isDeploySuccess, deployHash, deployedLocker, paymentHash, isAdmin, recordDeployment]);

  if (!isConnected) {
    return (
      <ConnectGate
        title="connect wallet to deploy locker"
        description="deploy your own locker contract for any aerodrome lp token."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-xl mx-auto space-y-6">
            <PageHeading
              eyebrow="new locker"
              title="deploy lp locker"
              description="deploy your own locker contract for any aerodrome lp token"
            />

            {/* Step 1: Configuration */}
            <div className="border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <StepBadge n={1} done={configReady} />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold tracking-tight mb-1">configure locker</h2>
                  <p className="text-[10px] text-muted-foreground">
                    set up your locker parameters and validate your pool
                  </p>
                </div>
              </div>

              <div className="sm:pl-10 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">your aerodrome lp positions</Label>
                    <button
                      type="button"
                      onClick={refetchPositions}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      refresh
                    </button>
                  </div>

                  {isLoadingPositions && (
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-14 border border-border bg-muted/30 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!isLoadingPositions && positions.length > 0 && (
                    <div className="space-y-2" role="radiogroup" aria-label="lp positions">
                      {positions.map((pos) => {
                        const selected = lpTokenAddress.toLowerCase() === pos.address.toLowerCase();
                        return (
                          <button
                            key={pos.address}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setLpTokenAddress(pos.address);
                              setShowManualLp(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors',
                              selected
                                ? 'border-foreground bg-foreground/5'
                                : 'border-border hover:border-foreground/40 hover:bg-muted/40',
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{pos.symbol.replace(/^[sv]AMM-/, '')}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {pos.stable ? 'stable' : 'volatile'} · {pos.address.slice(0, 6)}...{pos.address.slice(-4)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="font-mono tabular text-xs text-muted-foreground">
                                {formatTokenAmount(pos.balance, pos.decimals)}
                              </span>
                              <span
                                className={cn(
                                  'flex h-4 w-4 items-center justify-center rounded-full border',
                                  selected ? 'border-foreground bg-foreground text-background' : 'border-muted-foreground/50',
                                )}
                                aria-hidden
                              >
                                {selected && <Check className="h-3 w-3" />}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!isLoadingPositions && positions.length === 0 && (
                    <p className="border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                      {isPositionsError
                        ? "couldn't look up your lp tokens right now - paste the address below instead."
                        : 'no aerodrome lp tokens found in this wallet. if your lp is staked in a gauge, unstake it on aerodrome first, or paste the lp address below.'}
                    </p>
                  )}

                  {!showManualLp && positions.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowManualLp(true)}
                      className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      or paste an lp token address
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="lpToken" className="text-xs">lp token address</Label>
                      <Input
                        id="lpToken"
                        type="text"
                        placeholder="0x..."
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={lpTokenAddress}
                        onChange={(e) => setLpTokenAddress(e.target.value.trim())}
                        className="font-mono"
                      />
                    </div>
                  )}

                  {isValidLpAddress && isAerodromePool === false && (
                    <p className="text-[11px] text-destructive">
                      this isn&apos;t an aerodrome pool (v2 stable/volatile). only aerodrome lp tokens can be locked.
                    </p>
                  )}
                </div>

                {isValidLpAddress && tokenMetadata && (
                  <div className="border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-success">✓ token detected</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">symbol</span>
                      <span className="text-xs font-medium">{tokenMetadata.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground shrink-0">name</span>
                      <span className="text-xs font-medium text-right truncate">{tokenMetadata.name}</span>
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
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={feeReceiverAddress}
                    onChange={(e) => setFeeReceiverAddress(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    address that will receive claimed lp fees (usually your wallet)
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Payment (skipped for admin wallets) */}
            {!isAdmin && configReady && (
              <div className={`border border-border bg-card p-5 sm:p-6 ${hasPaidFee ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3 mb-4">
                  <StepBadge n={2} done={hasPaidFee} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-sm font-semibold tracking-tight">pay deployment fee</h2>
                      <span className="bg-success/15 text-success text-[10px] font-medium px-2 py-0.5 rounded">
                        50% OFF
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs line-through text-muted-foreground">${DEPLOYMENT_FEE_ORIGINAL_USD}</span>
                      <span className="text-sm font-semibold text-success">${DEPLOYMENT_FEE_USD}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({isPriceLoading ? '...' : `${deploymentFeeEth} ETH`})
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      🎉 new user special - save 50% on deployment
                    </p>
                  </div>
                </div>

                {!hasPaidFee && (
                  <div className="sm:pl-10">
                    {isPriceError && !ethPrice ? (
                      <Button
                        variant="outline"
                        onClick={() => refetchPrice()}
                        className="w-full sm:w-auto h-11 sm:h-9 text-xs"
                      >
                        couldn't load eth price - retry
                      </Button>
                    ) : (
                      <Button
                        onClick={handlePayFee}
                        disabled={isPaymentPending || isPaymentConfirming || isPriceLoading || !ethPrice}
                        className="w-full sm:w-auto h-11 sm:h-9 text-xs"
                      >
                        {isPaymentPending
                          ? 'confirm in your wallet...'
                          : isPaymentConfirming
                          ? 'waiting for confirmation...'
                          : isPriceLoading
                          ? 'loading price...'
                          : `pay $${DEPLOYMENT_FEE_USD} (${deploymentFeeEth} ETH)`}
                      </Button>
                    )}
                  </div>
                )}

                {hasPaidFee && (
                  <div className="sm:pl-10 text-xs text-success">
                    ✓ payment confirmed
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Deploy */}
            {feePaid && configReady && (
              <div className="border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start gap-3 mb-4">
                  <StepBadge n={isAdmin ? 2 : 3} />
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold tracking-tight mb-1">deploy contract</h2>
                    <p className="text-[10px] text-muted-foreground">
                      deploy your locker to the blockchain
                    </p>
                  </div>
                </div>

                <div className="sm:pl-10">
                  {!isDeploySuccess && (
                    <Button
                      onClick={handleDeploy}
                      disabled={isDeployPending || isDeployConfirming || !isValidLpAddress || !isValidFeeAddress}
                      className="w-full h-11 text-sm"
                    >
                      {isDeployPending
                        ? 'confirm in your wallet...'
                        : isDeployConfirming
                        ? 'deploying... waiting for confirmation'
                        : 'deploy locker'}
                    </Button>
                  )}

                  {isDeploySuccess && deployedLocker && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="text-success">✓ deployed at</span>
                        <AddressDisplay address={deployedLocker} />
                      </div>
                      {saveStatus === 'saving' && (
                        <p className="text-xs text-muted-foreground">recording your locker...</p>
                      )}
                      {saveStatus === 'saved' && (
                        <p className="text-xs text-success">✓ locker recorded - taking you to your lockers</p>
                      )}
                      {saveStatus === 'error' && (
                        <div className="space-y-3 border border-destructive/40 bg-destructive/10 p-3">
                          <p className="text-xs text-destructive [overflow-wrap:anywhere]">
                            your locker is live on-chain, but it couldn't be added to your dashboard: {saveError}
                          </p>
                          <Button variant="outline" onClick={recordDeployment} className="w-full h-11 sm:h-9 text-xs">
                            try again
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isAdmin && (
              <div className="border border-success/30 bg-success/10 p-4">
                <p className="text-[10px] text-success leading-relaxed">
                  🎉 <strong>limited time:</strong> new users save 50% on deployment! normally ${DEPLOYMENT_FEE_ORIGINAL_USD}, now just ${DEPLOYMENT_FEE_USD}. verify your pool details first, then secure your discounted deployment.
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="border border-primary/20 bg-primary/5 p-4">
                <p className="text-[10px] text-primary leading-relaxed">
                  ⚡ <strong>admin wallet:</strong> deployment fee waived
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              {!isAdmin && <p>• deployment fee: ${DEPLOYMENT_FEE_USD} (~{deploymentFeeEth} ETH, one-time payment)</p>}
              <p>• each locker is a separate contract instance</p>
              <p>• you control the locker as the owner</p>
              <p>• after deployment, you can create locks in this locker</p>
            </div>
          </div>
      </main>
    </div>
  );
}
