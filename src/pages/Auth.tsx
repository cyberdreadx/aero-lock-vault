import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ description: 'account created! redirecting...' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ description: 'signed in!' });
      }
      navigate('/lockers');
    } catch (error: any) {
      toast({ description: error.message || 'authentication failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5" />
            <span className="text-lg font-semibold tracking-tight">aerolock</span>
          </Link>
          <h1 className="text-sm tracking-tight mb-2">
            {isSignUp ? 'create account' : 'sign in'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isSignUp
              ? 'deploy and manage your lp lockers'
              : 'access your deployed lockers'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="border border-border p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs">email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs">password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-xs"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="sm"
          >
            {isLoading ? 'loading...' : isSignUp ? 'sign up' : 'sign in'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? 'already have an account? sign in'
                : "don't have an account? sign up"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
