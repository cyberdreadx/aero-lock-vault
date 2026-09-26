import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export function WalletButton({ size = 'sm' }: { size?: ButtonProps['size'] }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} size={size} className="text-xs">
                    <Wallet className="h-3.5 w-3.5" />
                    connect
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive" size={size} className="text-xs">
                    wrong network
                  </Button>
                );
              }

              return (
                <Button onClick={openAccountModal} variant="outline" size={size} className="font-mono text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                  {account.displayName}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
