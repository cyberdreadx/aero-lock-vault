// Credits an affiliate for a timed, vesting or team lock sale.
//
// Timed locks charge their fee inside the factory, so there's no separate payment to check.
// Instead the app appends the referrer to the lock transaction's calldata as
// "aeref:" + address (the contract ignores trailing calldata). That tag is signed by the
// buyer, so nobody can later claim someone else's sale by calling this with their own
// address. This function only reads the chain: the factory's events say what was created,
// and the factory's internal ETH transfer to the treasury says what fee was paid.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { decodeEventLog, isHash, parseAbi } from 'https://esm.sh/viem@2.37.12';
import { createBaseClient } from '../_shared/rpc.ts';
import { ethSent } from '../_shared/payments.ts';
import { TIMELOCK_FACTORY_ADDRESS } from '../_shared/timelockSources.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESS = '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e';
const ADMIN_WALLETS = [TREASURY_ADDRESS.toLowerCase()];
const AFFILIATE_COMMISSION_PERCENT = 20n;
// current factory first; v1 (no team batches) stays valid
const FACTORIES = [TIMELOCK_FACTORY_ADDRESS, '0x07E05724Be95Ea989F66471F822fB489aCFb83ea'].map((f) => f.toLowerCase());
// hex of ascii "aeref:" followed by a 20-byte address
const REFERRAL_TAG = /61657265663a([0-9a-f]{40})/;

const EVENTS = parseAbi([
  'event LockCreated(address indexed vault, address indexed token, address indexed owner, address creator, uint256 amount, bool isLP, uint8 kind, uint64 start, uint64 cliff, uint64 duration, uint32 steps)',
  'event BatchCreated(uint256 indexed batchId, address indexed creator, string label, uint256 count)',
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { txHash } = await req.json().catch(() => ({}));
    if (!isHash(txHash)) return json({ error: 'txHash is required' }, 400);
    const hash = String(txHash).toLowerCase() as `0x${string}`;

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: existing, error: existingError } = await supabase
      .from('affiliate_referrals')
      .select('referrer, commission_wei')
      .eq('payment_tx_hash', hash)
      .maybeSingle();
    if (existingError) return json({ error: 'Lookup failed' }, 500);
    if (existing) return json({ recorded: true, alreadyRecorded: true });

    const client = createBaseClient();
    const [tx, receipt] = await Promise.all([client.getTransaction({ hash }), client.getTransactionReceipt({ hash })]);
    if (receipt.status !== 'success') return json({ recorded: false, reason: 'transaction failed' });

    // what the factory created in this transaction
    let factory: string | null = null;
    let creator: string | null = null;
    const vaults: string[] = [];
    let isTeam = false;
    for (const log of receipt.logs) {
      const address = log.address.toLowerCase();
      if (!FACTORIES.includes(address)) continue;
      try {
        const event = decodeEventLog({ abi: EVENTS, data: log.data, topics: log.topics });
        factory = address;
        if (event.eventName === 'LockCreated') {
          vaults.push(event.args.vault.toLowerCase());
          creator = event.args.creator.toLowerCase();
        } else {
          isTeam = true;
        }
      } catch {
        // another event from the factory (fee changes etc.)
      }
    }
    if (!factory || !creator || vaults.length === 0) return json({ recorded: false, reason: 'not an AeroLock timed-lock transaction' });

    const tag = tx.input.toLowerCase().match(REFERRAL_TAG);
    if (!tag) return json({ recorded: false, reason: 'no referral' });
    const referrer = `0x${tag[1]}`;
    if (referrer === creator || ADMIN_WALLETS.includes(referrer)) return json({ recorded: false, reason: 'referrer not eligible' });

    // the fee is the factory's internal ETH transfer to the treasury
    const fee = await ethSent(tx, factory, TREASURY_ADDRESS);
    if (fee === null) return json({ error: "Couldn't read the fee yet - try again in a minute" }, 503);
    if (fee === 0n) return json({ recorded: false, reason: 'no fee was paid (fee-exempt wallet)' });

    const { error } = await supabase.from('affiliate_referrals').insert({
      referrer,
      buyer: creator,
      locker_address: vaults[0],
      payment_tx_hash: hash,
      sale_wei: fee.toString(),
      commission_wei: ((fee * AFFILIATE_COMMISSION_PERCENT) / 100n).toString(),
      product: isTeam ? 'team' : 'timelock',
    });
    if (error) {
      if (error.code === '23505') return json({ recorded: true, alreadyRecorded: true });
      console.error('Referral insert failed', error);
      return json({ error: 'Failed to record the referral' }, 500);
    }
    console.log('Timed-lock referral recorded', { referrer, creator, hash, fee: fee.toString(), locks: vaults.length });
    return json({ recorded: true, referrer, locks: vaults.length });
  } catch (error) {
    console.error('Error in record-timelock-sale:', error);
    return json({ error: "Couldn't reach Base right now - try again in a minute" }, 503);
  }
});
