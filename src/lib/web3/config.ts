import { createConfig, fallback, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { BASE_RPC_URLS } from './rpc';

const projectId = 'aerolock-dapp';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'AeroLock' }),
  ],
  transports: {
    // if one public RPC is rate-limited or down, the next one answers
    [base.id]: fallback(BASE_RPC_URLS.map((url) => http(url, { timeout: 10_000 }))),
  },
});
