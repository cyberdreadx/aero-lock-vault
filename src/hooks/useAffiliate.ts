import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Referral = Tables<'affiliate_referrals'>;

/** Every sale credited to `wallet`, newest first. */
export function useAffiliateReferrals(wallet?: string) {
  return useQuery({
    queryKey: ['affiliate-referrals', wallet?.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referrer', wallet!.toLowerCase())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wallet,
  });
}

/** All unpaid commissions, for the treasury's payout list. */
export function useUnpaidReferrals(enabled: boolean) {
  return useQuery({
    queryKey: ['affiliate-referrals', 'unpaid'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .is('paid_tx_hash', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled,
  });
}

/** Marks an affiliate's commissions paid once the server has seen the treasury's ETH transfer. */
export function useRecordPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payout: { txHash: string; affiliate: string }) => {
      const { data, error } = await supabase.functions.invoke('affiliate-payout', {
        body: { txHash: payout.txHash, affiliateAddress: payout.affiliate },
      });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data as { commissionsPaid: number; paidEth?: string; unallocatedEth?: string; alreadyRecorded?: boolean };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-referrals'] }),
  });
}

export function sumWei(rows: Pick<Referral, 'commission_wei'>[]): bigint {
  return rows.reduce((total, r) => total + BigInt(r.commission_wei), 0n);
}
