import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

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
  const [totalLocks, setTotalLocks] = useState(0);
  
  const query = useQuery({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const { data: lockers, error } = await supabase
        .from('deployed_lockers')
        .select('locker_address, lp_token_address, deployed_at')
        .order('deployed_at', { ascending: false });

      if (error) throw error;

      return {
        totalLockers: lockers?.length || 0,
        totalLocks: 0, // Will be updated separately
        lockers: lockers || [],
      } as GlobalStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update total locks count when lockers change
  useEffect(() => {
    if (!query.data?.lockers || query.data.lockers.length === 0) {
      setTotalLocks(0);
      return;
    }

    // Fetch lock counts from blockchain for each locker
    const fetchLockCounts = async () => {
      try {
        const counts = await Promise.all(
          query.data.lockers.map(async (locker) => {
            try {
              const response = await fetch(
                `https://mainnet.base.org`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [
                      {
                        to: locker.locker_address,
                        data: '0xbc4ab7fb', // getAllLockIds() selector
                      },
                      'latest',
                    ],
                  }),
                }
              );
              const json = await response.json();
              if (json.result && json.result !== '0x') {
                // Decode dynamic array: first 32 bytes = offset, next 32 bytes = length
                const data = json.result.slice(2);
                if (data.length >= 128) {
                  const length = parseInt(data.slice(64, 128), 16);
                  return Number.isFinite(length) ? length : 0;
                }
              }
              return 0;
            } catch (e) {
              console.error(`Failed to fetch locks for ${locker.locker_address}:`, e);
              return 0;
            }
          })
        );
        const total = counts.reduce((sum, count) => sum + count, 0);
        setTotalLocks(total);
      } catch (e) {
        console.error('Failed to fetch total locks:', e);
      }
    };

    fetchLockCounts();
  }, [query.data?.lockers]);

  return {
    ...query,
    data: query.data ? { ...query.data, totalLocks } : undefined,
  };
}
