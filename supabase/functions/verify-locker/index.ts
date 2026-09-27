// Submits an already-recorded locker to Basescan for source verification.
// Used to backfill lockers deployed before automatic verification, or to retry one.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createPublicClient, http, isAddress } from 'https://esm.sh/viem@2.37.12';
import { base } from 'https://esm.sh/viem@2.37.12/chains';
import { submitLockerVerification } from '../_shared/basescan.ts';
import { inspectLocker, lockerConstructorArgs } from '../_shared/locker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lockerAddress } = await req.json();
    if (!lockerAddress || !isAddress(lockerAddress, { strict: false })) {
      return json({ error: 'A valid lockerAddress is required' }, 400);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // only lockers deployed through aerolock
    const { data: locker, error } = await supabaseClient
      .from('deployed_lockers')
      .select('locker_address, deployment_tx_hash')
      .ilike('locker_address', lockerAddress)
      .maybeSingle();

    if (error) return json({ error: 'Lookup failed', details: error.message }, 500);
    if (!locker?.deployment_tx_hash) return json({ error: 'Unknown locker' }, 404);

    const publicClient = createPublicClient({ chain: base, transport: http() });
    const hash = locker.deployment_tx_hash as `0x${string}`;
    const deployReceipt = await publicClient.getTransactionReceipt({ hash });
    const lockerInfo = await inspectLocker(locker.locker_address, deployReceipt);
    if (!lockerInfo.ok) {
      return json({ error: lockerInfo.reason }, 400);
    }

    const result = await submitLockerVerification(
      locker.locker_address,
      lockerConstructorArgs(lockerInfo.tokenContract, lockerInfo.owner, lockerInfo.feeReceiver),
    );
    return json(result, result.status === 'failed' ? 502 : 200);
  } catch (error) {
    console.error('Error in verify-locker function:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error occurred' }, 500);
  }
});
