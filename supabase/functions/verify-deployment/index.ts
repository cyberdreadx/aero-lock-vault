import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createPublicClient, http, formatEther } from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e';
const DEPLOYMENT_FEE_USD = 75;
const MIN_ETH_AMOUNT = '0.001'; // Minimum acceptable payment (adjust based on price volatility)

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

    console.log('Verifying deployment:', { 
      paymentTxHash, 
      lockerAddress, 
      walletAddress 
    });

    // Validate inputs
    if (!paymentTxHash || !lockerAddress || !lpTokenAddress || !feeReceiverAddress || !deploymentTxHash || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Base chain client
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

    // Verify payment transaction on-chain
    console.log('Fetching transaction:', paymentTxHash);
    const transaction = await publicClient.getTransaction({
      hash: paymentTxHash as `0x${string}`
    });

    if (!transaction) {
      console.error('Transaction not found');
      return new Response(
        JSON.stringify({ error: 'Payment transaction not found on chain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction was successful
    const receipt = await publicClient.getTransactionReceipt({
      hash: paymentTxHash as `0x${string}`
    });

    if (!receipt || receipt.status !== 'success') {
      console.error('Transaction failed or not confirmed:', receipt?.status);
      return new Response(
        JSON.stringify({ error: 'Payment transaction failed or not confirmed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment went to treasury
    if (transaction.to?.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
      console.error('Payment sent to wrong address:', transaction.to);
      return new Response(
        JSON.stringify({ error: 'Payment was not sent to the correct treasury address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment amount (minimum threshold to account for price fluctuations)
    const paidAmount = formatEther(transaction.value);
    if (parseFloat(paidAmount) < parseFloat(MIN_ETH_AMOUNT)) {
      console.error('Payment amount too low:', paidAmount);
      return new Response(
        JSON.stringify({ error: `Payment amount too low. Minimum ${MIN_ETH_AMOUNT} ETH required` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified successfully:', paidAmount, 'ETH');

    // Payment verified - save to database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabaseClient
      .from('deployed_lockers')
      .insert({
        locker_address: lockerAddress,
        lp_token_address: lpTokenAddress,
        fee_receiver_address: feeReceiverAddress,
        deployment_tx_hash: deploymentTxHash,
        wallet_address: walletAddress,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save deployment', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deployment saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        verified: {
          paymentAmount: paidAmount,
          treasury: TREASURY_ADDRESS
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-deployment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
