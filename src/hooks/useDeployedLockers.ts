import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeployedLocker {
  id: string;
  user_id: string;
  locker_address: string;
  lp_token_address: string;
  fee_receiver_address: string;
  deployment_tx_hash: string | null;
  deployed_at: string;
  created_at: string;
}

export function useDeployedLockers() {
  return useQuery({
    queryKey: ['deployed-lockers'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deployed_lockers')
        .select('*')
        .order('deployed_at', { ascending: false });

      if (error) throw error;
      return data as DeployedLocker[];
    },
  });
}

export function useSaveDeployedLocker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locker: {
      locker_address: string;
      lp_token_address: string;
      fee_receiver_address: string;
      deployment_tx_hash?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deployed_lockers')
        .insert({
          user_id: session.session.user.id,
          ...locker,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployed-lockers'] });
    },
  });
}
