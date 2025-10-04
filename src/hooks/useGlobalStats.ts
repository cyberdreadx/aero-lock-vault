import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalStats {
  totalLockers: number;
  totalLocks: number;
  lockers: Array<{
    locker_address: string;
    lp_token_address: string;
    deployed_at: string;
  }>;
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const { data: lockers, error } = await supabase
        .from('deployed_lockers')
        .select('locker_address, lp_token_address, deployed_at')
        .order('deployed_at', { ascending: false });

      if (error) throw error;

      return {
        totalLockers: lockers?.length || 0,
        totalLocks: 0, // Will be calculated from blockchain
        lockers: lockers || [],
      } as GlobalStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
