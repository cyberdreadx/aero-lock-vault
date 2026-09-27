import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createPublicClient, http, formatEther, isAddress, isHash, parseEther } from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';
import { constructorArgsFromDeployInput, runInBackground, submitLockerVerification } from '../_shared/basescan.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e';
const DEPLOYMENT_FEE_USD = 75;
// ETH can move between paying and saving, and price feeds differ slightly
const PRICE_TOLERANCE = 0.9;

// Wallets allowed to deploy without paying the fee
const ADMIN_WALLETS = [TREASURY_ADDRESS.toLowerCase()];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const reject = (error: string, status = 400) => {
  console.error('Rejected:', error);
  return json({ error }, status);
};

async function fetchEthUsd(): Promise<number | null> {
  const sources: Array<() => Promise<number>> = [
    async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      return Number((await res.json())?.ethereum?.usd);
    },
    async () => {
      const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
      return Number((await res.json())?.data?.amount);
    },
  ];
  for (const source of sources) {
    try {
      const price = await source();
      if (Number.isFinite(price) && price > 0) return price;
    } catch (error) {
      console.warn('ETH price source failed', error);
    }
  }
  return null;
}

/** constructor(address tokenContract_, address owner_, address feeReceiver_) */
function decodeLockerArgs(deployInput: string) {
  const args = constructorArgsFromDeployInput(deployInput);
  const word = (i: number) => `0x${args.slice(i * 64 + 24, (i + 1) * 64)}`.toLowerCase();
  return { tokenContract: word(0), owner: word(1), feeReceiver: word(2) };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      paymentTxHash,
      lockerAddress,
      lpTokenAddress,
      feeReceiverAddress,
      deploymentTxHash,
      walletAddress
    } = await req.json();

    console.log('Verifying deployment:', { paymentTxHash, lockerAddress, walletAddress });

    const wallet = String(walletAddress ?? '').toLowerCase();
    const isAdmin = ADMIN_WALLETS.includes(wallet);

    // Validate inputs (admins may deploy without a payment transaction)
    if (!lockerAddress || !lpTokenAddress || !feeReceiverAddress || !deploymentTxHash || !walletAddress || (!isAdmin && !paymentTxHash)) {
      return reject('Missing required fields');
    }
    if (![lockerAddress, lpTokenAddress, feeReceiverAddress, walletAddress].every((a) => isAddress(a, { strict: false }))) {
      return reject('Invalid address');
    }
    if (!isHash(deploymentTxHash) || (paymentTxHash && !isHash(paymentTxHash))) {
      return reject('Invalid transaction hash');
    }

    const locker = String(lockerAddress).toLowerCase();
    const publicClient = createPublicClient({ chain: base, transport: http() });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Already recorded? Retrying the same save is fine; claiming someone else's locker isn't.
    const { data: existing, error: existingError } = await supabaseClient
      .from('deployed_lockers')
      .select('*')
      .ilike('locker_address', locker)
      .maybeSingle();
    if (existingError) return reject('Lookup failed', 500);
    if (existing) {
      if (String(existing.wallet_address).toLowerCase() === wallet) {
        return json({ success: true, data: existing, alreadyRecorded: true });
      }
      return reject('This locker is already registered to another wallet', 409);
    }

    // The deployment tx must have been sent by this wallet and created this locker
    const deployHash = deploymentTxHash as `0x${string}`;
    const [deployTx, deployReceipt] = await Promise.all([
      publicClient.getTransaction({ hash: deployHash }),
      publicClient.getTransactionReceipt({ hash: deployHash }),
    ]);
    if (deployReceipt.status !== 'success') {
      return reject('Deployment transaction failed');
    }
    if (deployTx.from.toLowerCase() !== wallet) {
      return reject('Deployment transaction was not sent by this wallet', 403);
    }
    if (deployReceipt.contractAddress?.toLowerCase() !== locker) {
      return reject('Deployment transaction did not create this locker');
    }
    const lockerArgs = decodeLockerArgs(deployTx.input);
    if (
      lockerArgs.tokenContract !== String(lpTokenAddress).toLowerCase() ||
      lockerArgs.feeReceiver !== String(feeReceiverAddress).toLowerCase()
    ) {
      return reject('LP token or fee receiver does not match the deployed locker');
    }

    let paidAmount = '0';
    let paymentHash: string | null = null;

    if (isAdmin) {
      console.log('Admin wallet verified - deployment fee waived');
    } else {
      paymentHash = String(paymentTxHash).toLowerCase();

      // Each payment pays for one locker
      const { data: used, error: usedError } = await supabaseClient
        .from('deployed_lockers')
        .select('locker_address')
        .eq('payment_tx_hash', paymentHash)
        .maybeSingle();
      if (usedError) return reject('Lookup failed', 500);
      if (used) return reject('This payment has already been used for another locker', 409);

      const [transaction, receipt] = await Promise.all([
        publicClient.getTransaction({ hash: paymentHash as `0x${string}` }),
        publicClient.getTransactionReceipt({ hash: paymentHash as `0x${string}` }),
      ]);

      if (!receipt || receipt.status !== 'success') {
        return reject('Payment transaction failed or not confirmed');
      }
      if (transaction.to?.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
        return reject('Payment was not sent to the correct treasury address');
      }
      if (transaction.from.toLowerCase() !== wallet) {
        return reject('Payment was not sent by this wallet', 403);
      }
      if (receipt.blockNumber > deployReceipt.blockNumber) {
        return reject('Payment must be made before the locker is deployed');
      }

      const ethUsd = await fetchEthUsd();
      if (!ethUsd) {
        return reject('Could not confirm the ETH price right now - please try again', 503);
      }
      const requiredWei = parseEther(((DEPLOYMENT_FEE_USD / ethUsd) * PRICE_TOLERANCE).toFixed(18));
      paidAmount = formatEther(transaction.value);
      if (transaction.value < requiredWei) {
        return reject(
          `Payment too low: ${paidAmount} ETH sent, about ${formatEther(requiredWei)} ETH ($${DEPLOYMENT_FEE_USD}) required`,
        );
      }

      console.log('Payment verified successfully:', paidAmount, 'ETH at', ethUsd, 'USD/ETH');
    }

    const { data, error } = await supabaseClient
      .from('deployed_lockers')
      .insert({
        locker_address: lockerAddress,
        lp_token_address: lpTokenAddress,
        fee_receiver_address: feeReceiverAddress,
        deployment_tx_hash: deploymentTxHash,
        wallet_address: wallet,
        payment_tx_hash: paymentHash,
      })
      .select()
      .single();

    if (error) {
      // unique violation: a concurrent request used the same payment or locker
      if (error.code === '23505') return reject('This payment or locker has already been recorded', 409);
      console.error('Database error:', error);
      return json({ error: 'Failed to save deployment', details: error.message }, 500);
    }

    console.log('Deployment saved successfully:', data);

    // Verify the new locker on Basescan without holding up the response
    runInBackground(submitLockerVerification(lockerAddress, constructorArgsFromDeployInput(deployTx.input)));

    return json({
      success: true,
      data,
      verified: {
        paymentAmount: paidAmount,
        treasury: TREASURY_ADDRESS
      }
    });

  } catch (error) {
    console.error('Error in verify-deployment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: errorMessage }, 500);
  }
});
