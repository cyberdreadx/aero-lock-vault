# AeroLock timed & vesting locks

Contracts for AeroLock's second product: locks that unlock on a schedule, for any ERC-20
token or an Aerodrome LP (with trading-fee claiming kept on).

> **Status: testnet only.** Not audited. Do not deploy to Base mainnet before an audit.

| Contract | What it does |
| --- | --- |
| `AeroLockFactory` | Takes the creation fee, validates the schedule, creates a vault per lock and funds it. Its admin can change only the fee, treasury and fee-exempt list. |
| `AeroVestingVault` | One per lock (minimal clone). Holds the tokens and releases them to the owner on the schedule. Nobody can take tokens out faster, including the factory admin. Not upgradeable. |

## Schedules

| Kind | Behaviour |
| --- | --- |
| `Fixed` | Everything unlocks on one date. The owner can move the date later, never earlier. |
| `CliffLinear` | Nothing until the cliff, then unlocks continuously over `duration`. |
| `Steps` | `steps` equal parts, one every `duration` seconds (e.g. 12 × 30 days). |

## Setup

```shell
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
```

## Test

```shell
forge test                                            # unit + fuzz (2,000 runs each)
RUN_FORK=true forge test --match-contract Fork -vv    # against real Aerodrome on Base
```

## Deploy to Base Sepolia

1. Get Base Sepolia ETH from a faucet (e.g. the Coinbase Developer Platform faucet).
2. Import a throwaway deployer key: `cast wallet import aerolock-test --interactive`
3. Deploy (on testnet this also creates a test token and a test LP pool, minted to you):

```shell
OWNER=0xYourAdminWallet TREASURY=0xYourTreasury FEE_WEI=55770000000000000 \
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org \
  --account aerolock-test --broadcast --verify --verifier etherscan \
  --etherscan-api-key $BASESCAN_API_KEY
```

`FEE_WEI` is fixed in ETH, so its dollar value drifts. 0.05577 ETH ≈ $150 at $2,690/ETH.
The owner can update it at any time with `setFee`.
