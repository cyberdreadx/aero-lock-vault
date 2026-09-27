// Records an affiliate commission payout. The treasury sends ETH to the affiliate, then
// this marks their owed commissions paid - but only after checking on-chain that the
// treasury really sent that much, so nobody can mark commissions paid without paying.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { formatEther, isAddress, isHash } from 'https://esm.sh/viem@2.37.12';
import { createBaseClient } from '../_shared/rpc.ts';
import { ethSent } from '../_shared/payments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const reject = (error: string, status = 400) => {
  console.error('Rejected:', error);
  return json({ error }, status);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { txHash, affiliateAddress } = await req.json();
    if (!isHash(txHash) || !isAddress(affiliateAddress, { strict: false })) {
      return reject('A payout transaction hash and affiliate address are required');
    }
    const hash = String(txHash).toLowerCase();
    const affiliate = String(affiliateAddress).toLowerCase();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Already recorded? Report it again rather than paying out twice from one transaction.
    const { data: already, error: alreadyError } = await supabaseClient
      .from('affiliate_referrals')
      .select('id, referrer, commission_wei')
      .eq('paid_tx_hash', hash);
    if (alreadyError) return reject('Lookup failed', 500);
    if (already && already.length > 0) {
      if (already[0].referrer !== affiliate) return reject('This transaction already paid a different affiliate', 409);
      return json({ success: true, alreadyRecorded: true, commissionsPaid: already.length });
    }

    const client = createBaseClient();
    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: hash as `0x${string}` }),
      client.getTransactionReceipt({ hash: hash as `0x${string}` }),
    ]);
    if (receipt.status !== 'success') return reject('Payout transaction failed');
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    const paidAt = new Date(Number(block.timestamp) * 1000);

    const sent = await ethSent(transaction, TREASURY_ADDRESS, affiliate);
    if (sent === null) return reject("Couldn't read the payout yet - please try again in a minute", 503);
    if (sent === 0n) return reject('No ETH from the treasury to this affiliate was found in that transaction', 403);

    // Commissions earned before the payout, oldest first
    const { data: owed, error: owedError } = await supabaseClient
      .from('affiliate_referrals')
      .select('id, commission_wei')
      .eq('referrer', affiliate)
      .is('paid_tx_hash', null)
      .lte('created_at', paidAt.toISOString())
      .order('created_at', { ascending: true });
    if (owedError) return reject('Lookup failed', 500);

    // Mark as many as the payout fully covers
    const covered: string[] = [];
    let total = 0n;
    for (const row of owed ?? []) {
      const next = total + BigInt(row.commission_wei);
      if (next > sent) break;
      covered.push(row.id);
      total = next;
    }
    if (covered.length === 0) {
      return reject(`The payout (${formatEther(sent)} ETH) doesn't cover this affiliate's oldest unpaid commission`);
    }

    const { data: updated, error: updateError } = await supabaseClient
      .from('affiliate_referrals')
      .update({ paid_tx_hash: hash, paid_at: paidAt.toISOString() })
      .in('id', covered)
      .is('paid_tx_hash', null)
      .select('id');
    if (updateError) return reject('Failed to record the payout', 500);

    console.log(`Payout ${hash}: ${updated?.length} commissions, ${formatEther(total)} of ${formatEther(sent)} ETH`);
    return json({
      success: true,
      commissionsPaid: updated?.length ?? 0,
      paidEth: formatEther(total),
      sentEth: formatEther(sent),
      unallocatedEth: formatEther(sent - total),
    });
  } catch (error) {
    console.error('Error in affiliate-payout function:', error);
    return json({ error: "Couldn't reach Base to check the payout right now - please try again in a minute" }, 503);
  }
});
