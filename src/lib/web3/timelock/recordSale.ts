import { supabase } from '@/integrations/supabase/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks the backend to credit the referrer of a timed-lock sale. Runs in the background and
 * retries while Base's indexer catches up with the fee transfer; never blocks the user.
 */
export async function recordTimelockSale(txHash: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('record-timelock-sale', { body: { txHash } });
      // a definite answer (recorded, or not eligible) ends it; 503s and network errors retry
      if (!error && data) return;
    } catch {
      // retry
    }
    await sleep(20_000);
  }
}
