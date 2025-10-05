import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useCheckLockerOwnership() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');

      const { data, error } = await supabase.functions.invoke('check-locker-ownership', {
        body: { walletAddress: address.toLowerCase() }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployed-lockers', address] });
      toast({ 
        description: data.message || 'Scan complete',
      });
    },
    onError: (error: Error) => {
      toast({ 
        description: error.message || 'Failed to check ownership',
        variant: 'destructive'
      });
    }
  });
}
