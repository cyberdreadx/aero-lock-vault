import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, isConnecting } = useAccount();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Wait for wagmi to finish checking connection status
    if (!isConnecting) {
      setHasChecked(true);
      
      if (!isConnected) {
        toast({ description: 'please connect your wallet to continue', variant: 'destructive' });
        navigate('/');
      }
    }
  }, [isConnected, isConnecting, navigate, toast]);

  // Show nothing while checking connection
  if (isConnecting || !hasChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xs text-muted-foreground">checking wallet connection...</p>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  return <>{children}</>;
}
