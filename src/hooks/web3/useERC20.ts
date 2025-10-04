import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ERC20ABI } from '@/lib/web3/abis/ERC20ABI';
import type { TokenMetadata } from '@/types/web3';

export function useERC20(tokenAddress?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) throw new Error('Token address required');
    return await writeContractAsync({
      address: tokenAddress,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [spender, amount],
    } as any);
  };

  return { approve };
}

export function useTokenBalance(tokenAddress?: `0x${string}`) {
  const { address } = useAccount();
  
  return useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
    },
  }) as { data: bigint | undefined; isLoading: boolean; refetch: () => void };
}

export function useTokenAllowance(tokenAddress?: `0x${string}`, spender?: `0x${string}`) {
  const { address } = useAccount();
  
  return useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: {
      enabled: !!tokenAddress && !!address && !!spender,
    },
  }) as { data: bigint | undefined; isLoading: boolean; refetch: () => void };
}

export function useTokenMetadata(tokenAddress?: `0x${string}`) {
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress },
  });

  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'name',
    query: { enabled: !!tokenAddress },
  });

  if (!tokenAddress || !symbol || !decimals || !name) {
    return { data: undefined, isLoading: !tokenAddress };
  }

  return {
    data: {
      address: tokenAddress,
      symbol,
      decimals,
      name,
    } as TokenMetadata,
    isLoading: false,
  };
}
