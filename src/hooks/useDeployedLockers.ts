import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';

export interface DeployedLocker {
  id: string;
  wallet_address: string;
  locker_address: string;
  lp_token_address: string;
  fee_receiver_address: string;
  deployment_tx_hash: string | null;
  deployed_at: string | null;
  created_at: string | null;
}

export function useDeployedLockers() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['deployed-lockers', address],
    queryFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      const { data, error } = await supabase
        .from('deployed_lockers')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .order('deployed_at', { ascending: false });

      if (error) throw error;
      return data as DeployedLocker[];
    },
    enabled: !!address,
  });
}

export function useSaveDeployedLocker() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (locker: {
      locker_address: string;
      lp_token_address: string;
      fee_receiver_address: string;
      deployment_tx_hash: string;
      payment_tx_hash: string;
    }) => {
      if (!address) throw new Error('Wallet not connected');

      const { data, error } = await supabase.functions.invoke('verify-deployment', {
        body: {
          paymentTxHash: locker.payment_tx_hash,
          lockerAddress: locker.locker_address,
          lpTokenAddress: locker.lp_token_address,
          feeReceiverAddress: locker.fee_receiver_address,
          deploymentTxHash: locker.deployment_tx_hash,
          walletAddress: address.toLowerCase(),
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployed-lockers', address] });
    },
  });
}
