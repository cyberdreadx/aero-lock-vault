import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all deployed lockers
    const { data: lockers, error: fetchError } = await supabase
      .from('deployed_lockers')
      .select('locker_address');

    if (fetchError) {
      throw fetchError;
    }

    const BASE_RPC = 'https://mainnet.base.org';
    const updatedCount = { count: 0 };

    // Check ownership for each locker
    for (const locker of lockers || []) {
      try {
        // Call owner() function on the locker contract
        const response = await fetch(BASE_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: locker.locker_address,
                data: '0x8da5cb5b', // owner() function selector
              },
              'latest',
            ],
            id: 1,
          }),
        });

        const result = await response.json();
        
        if (result.result) {
          // Extract address from the result (remove padding)
          const ownerAddress = '0x' + result.result.slice(-40);
          
          // If the wallet is the owner, update the database
          if (ownerAddress.toLowerCase() === walletAddress.toLowerCase()) {
            await supabase
              .from('deployed_lockers')
              .update({ current_owner: walletAddress.toLowerCase() })
              .eq('locker_address', locker.locker_address);
            
            updatedCount.count++;
          }
        }
      } catch (error) {
        console.error(`Error checking locker ${locker.locker_address}:`, error);
        // Continue with next locker
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        lockersFound: updatedCount.count,
        message: updatedCount.count > 0 
          ? `Found ${updatedCount.count} locker(s) owned by you` 
          : 'No additional lockers found'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
