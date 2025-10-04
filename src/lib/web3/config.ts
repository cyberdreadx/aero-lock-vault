import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = 'aerolock-dapp';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'AeroLock' }),
  ],
  transports: {
    [base.id]: http(),
  },
});
