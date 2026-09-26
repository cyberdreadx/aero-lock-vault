import { Lock } from 'lucide-react';
import { WalletButton } from '@/components/web3/WalletButton';
import { AppHeader } from '@/components/layout/AppHeader';

export function ConnectGate({ title, description }: { title: string; description?: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <AppHeader showWallet={false} />
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="absolute inset-0 bg-grid mask-fade-b pointer-events-none" aria-hidden />
        <div className="relative w-full max-w-sm border border-border bg-card p-8 text-center space-y-6">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border border-border">
            <Lock className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
          </div>
          <div className="flex justify-center [&_button]:w-full [&>div]:w-full">
            <WalletButton size="default" />
          </div>
        </div>
      </main>
    </div>
  );
}
