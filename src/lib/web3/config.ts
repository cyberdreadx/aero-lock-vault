import { createConfig, fallback, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { BASE_RPC_URLS } from './rpc';

// Reown (WalletConnect) Cloud project. Public by design - it ships in the site's code.
// The old 'aerolock-dapp' placeholder was rejected by Reown, so WalletConnect/QR connections failed.
const projectId = 'cd4f138cd45bcb14df400b15eb4e6e7c';

// shown by wallets when asking to connect
const appMetadata = {
  name: 'AeroLock',
  description: 'Lock Aerodrome LP and tokens on Base with a public 30-day withdrawal notice.',
  url: 'https://aerolock.app',
  icons: ['https://aerolock.app/favicon.png'],
};

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({ projectId, metadata: appMetadata }),
    coinbaseWallet({ appName: appMetadata.name, appLogoUrl: appMetadata.icons[0] }),
  ],
  transports: {
    // if one public RPC is rate-limited or down, the next one answers
    [base.id]: fallback(BASE_RPC_URLS.map((url) => http(url, { timeout: 10_000 }))),
  },
});
