import { useQuery } from '@tanstack/react-query';

export function useEthPrice() {
  return useQuery({
    queryKey: ['eth-price'],
    queryFn: async () => {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      const data = await response.json();
      return data.ethereum.usd as number;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

export function calculateEthAmount(usdAmount: number, ethPrice: number): string {
  return (usdAmount / ethPrice).toFixed(6);
}
