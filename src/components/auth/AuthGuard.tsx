import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) {
      toast({ description: 'please connect your wallet to continue', variant: 'destructive' });
      navigate('/');
    }
  }, [isConnected, navigate, toast]);

  if (!isConnected) {
    return null;
  }

  return <>{children}</>;
}
