# AeroLock - Secure LP Token Locker for Aerodrome Finance

AeroLock is a decentralized application for locking Aerodrome Finance LP tokens with advanced timelock controls and fee management capabilities.

## 🔒 Features

- **Deploy Custom Lockers**: Deploy your own LP token locker contract for any Aerodrome LP token
- **Secure Timelocks**: Lock tokens with configurable unlock dates and 30-day emergency timelock
- **Fee Management**: Automatically claim and distribute LP fees to designated receivers
- **On-Chain Verification**: All deployments verified on-chain before saving to prevent fraud
- **Real-Time Stats**: Track total locked value, active locks, and pool statistics
- **Web3 Native**: Direct blockchain interaction via RainbowKit wallet integration

## 🚀 Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Web3**: wagmi + viem + RainbowKit
- **Backend**: Lovable Cloud (Supabase)
- **Blockchain**: Base Network (Aerodrome Finance)
- **Smart Contracts**: Solidity LP Locker contracts

## 💰 Deployment Fee

- **New User Special**: $75 (50% off from $150)
- Dynamic ETH pricing based on real-time USD conversion
- One-time payment to treasury address
- Verified on-chain before contract deployment

## 🛠️ Development

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- Base network RPC access

### Local Setup

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### Environment Variables

The following are auto-configured by Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase API endpoint
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key (safe for client-side)
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

## 🔐 Security

- **RLS Policies**: Database protected with Row-Level Security
- **On-Chain Verification**: Payment verification via Base blockchain
- **Edge Function Validation**: Server-side transaction verification
- **Address Validation**: Ethereum address format validation

## 📦 Smart Contracts

LP Locker contracts include:
- ERC20 token locking with timelock
- Fee claiming and distribution
- Emergency unlock with 30-day delay
- Owner-controlled operations

## 🌐 Deployment

Deploy via Lovable:
1. Open [Lovable Project](https://lovable.dev/projects/69f99495-aaa4-4b9a-b39b-7fb0f1b9c3a1)
2. Click Share → Publish
3. Configure custom domain (optional)

## 📝 License

Built with Lovable - [View Project](https://lovable.dev/projects/69f99495-aaa4-4b9a-b39b-7fb0f1b9c3a1)

## 🤝 Contributing

This project uses:
- Vite for build tooling
- TypeScript for type safety
- React for UI components
- shadcn-ui for component library
- Tailwind CSS for styling
- wagmi for Ethereum interactions

## 📚 Documentation

- [Lovable Docs](https://docs.lovable.dev)
- [Custom Domain Setup](https://docs.lovable.dev/features/custom-domain)
- [RainbowKit Docs](https://www.rainbowkit.com)
- [wagmi Docs](https://wagmi.sh)
