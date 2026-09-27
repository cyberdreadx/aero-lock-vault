import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { formatEther, isAddress, isHash, parseEther } from 'https://esm.sh/viem@2.37.12';
import { runInBackground, submitLockerVerification } from '../_shared/basescan.ts';
import { inspectLocker, lockerConstructorArgs } from '../_shared/locker.ts';
import { createBaseClient } from '../_shared/rpc.ts';
import { paidToTreasury } from '../_shared/payments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e';
const DEPLOYMENT_FEE_USD = 75;
// ETH can move between paying and saving, and price feeds differ slightly
const PRICE_TOLERANCE = 0.9;
// Share of each referred sale owed to the affiliate who referred it
const AFFILIATE_COMMISSION_PERCENT = 20n;

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
      walletAddress,
      referrerAddress
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
    const publicClient = createBaseClient();

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

    // The deployment tx must have created a genuine AeroLock locker owned by this wallet.
    // Checked via the locker's creation event and code, which works for regular and smart wallets.
    const deployReceipt = await publicClient.getTransactionReceipt({ hash: deploymentTxHash as `0x${string}` });
    const lockerInfo = await inspectLocker(locker, deployReceipt);
    if (!lockerInfo.ok) {
      return reject(lockerInfo.reason);
    }
    if (lockerInfo.owner !== wallet) {
      return reject('This locker was not created for this wallet', 403);
    }
    if (
      lockerInfo.tokenContract !== String(lpTokenAddress).toLowerCase() ||
      lockerInfo.feeReceiver !== String(feeReceiverAddress).toLowerCase()
    ) {
      return reject('LP token or fee receiver does not match the deployed locker');
    }

    let paidAmount = '0';
    let paidWei = 0n;
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
      if (receipt.blockNumber > deployReceipt.blockNumber) {
        return reject('Payment must be made before the locker is deployed');
      }

      const ethUsd = await fetchEthUsd();
      if (!ethUsd) {
        return reject('Could not confirm the ETH price right now - please try again', 503);
      }
      const requiredWei = parseEther(((DEPLOYMENT_FEE_USD / ethUsd) * PRICE_TOLERANCE).toFixed(18));

      // must be ETH from this wallet to the treasury (directly, or inside a smart-wallet transaction)
      const paid = await paidToTreasury(transaction, wallet, TREASURY_ADDRESS);
      if (paid === null) {
        return reject("Couldn't read the payment yet - please try again in a minute", 503);
      }
      if (paid === 0n) {
        return reject('No payment from this wallet to the treasury was found in that transaction', 403);
      }
      paidAmount = formatEther(paid);
      paidWei = paid;
      if (paid < requiredWei) {
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

    // Credit the affiliate whose link brought this paid sale (never the buyer themselves)
    const referrer = String(referrerAddress ?? '').toLowerCase();
    if (paymentHash && paidWei > 0n && isAddress(referrer, { strict: false }) && referrer !== wallet && !ADMIN_WALLETS.includes(referrer)) {
      const { error: referralError } = await supabaseClient.from('affiliate_referrals').insert({
        referrer,
        buyer: wallet,
        locker_address: locker,
        payment_tx_hash: paymentHash,
        sale_wei: paidWei.toString(),
        commission_wei: ((paidWei * AFFILIATE_COMMISSION_PERCENT) / 100n).toString(),
      });
      // the sale itself is already saved; a referral that fails to record is logged, not fatal
      if (referralError) console.error('Referral not recorded:', referralError);
      else console.log('Referral recorded for', referrer);
    }

    // Verify the new locker on Basescan without holding up the response
    runInBackground(
      submitLockerVerification(
        lockerAddress,
        lockerConstructorArgs(lockerInfo.tokenContract, lockerInfo.owner, lockerInfo.feeReceiver),
      ),
    );

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
    // usually a Base RPC hiccup (rate limit, timeout); the app offers a retry
    return json({ error: "Couldn't reach Base to verify right now - please try again in a minute" }, 503);
  }
});
