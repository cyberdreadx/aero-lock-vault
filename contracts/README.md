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

## Team vesting (batches)

`createLocks(CreateParams[], label)` makes up to 40 locks in one transaction - e.g. a team,
each member with their own wallet, amount and schedule. Every lock is an ordinary vault owned
by its member; the creator has no control over them afterwards. The batch (creator, time,
label, vaults) is stored for a public team page. One fee: `feeUsd` plus `feePerExtraLockUsd`
for each lock after the first ($150 + $25 each by default). 40 locks use ~12.7M gas, under
the 16.7M per-transaction cap.

## Fee

The fee is set in US dollars (`feeUsd`, 8 decimals: `150e8` = $150) and charged in ETH at
Chainlink's live ETH/USD price, rounded up. Callers may send more; the excess is refunded in
the same transaction. If the price is over an hour old, or Base's sequencer is down or
restarted less than an hour ago, lock creation pauses instead of charging a wrong price.
The owner can change `feeUsd`, the treasury, fee-exempt wallets and the max price age -
nothing else.

## Deploy to Base Sepolia (testnet) - step by step

You need a computer (Mac, Linux, or Windows with WSL). Nothing here touches real money.

1. **Install Foundry** (one time):
   ```shell
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
2. **Get the code** and its libraries:
   ```shell
   git clone https://github.com/cyberdreadx/aero-lock-vault.git
   cd aero-lock-vault/contracts
   forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
   forge test
   ```
   You should see every test pass.
3. **Make a throwaway deployer wallet** - never your real admin wallet's key:
   ```shell
   cast wallet new
   ```
   Note the address. Then save its private key under a name (it asks for the key and a password):
   ```shell
   cast wallet import aerolock-test --interactive
   ```
4. **Get free testnet ETH** for that address from the Coinbase faucet
   (portal.cdp.coinbase.com/products/faucet, network: Base Sepolia). 0.05 ETH is plenty.
5. **Deploy.** Your admin wallet becomes the owner and treasury:
   ```shell
   OWNER=0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e \
   TREASURY=0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e \
   FEE_USD=150 \
   forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org \
     --account aerolock-test --broadcast
   ```
   On testnet this also creates a test token and a test LP pool (1,000,000 of each, sent
   to the deployer wallet) so every flow can be tried.
6. **Send the printed addresses** (AeroLockFactory, Test token, Test LP pool) back so the
   app can be pointed at them. To verify the source on Basescan, add
   `--verify --verifier etherscan --etherscan-api-key <BASESCAN_API_KEY>` to step 5.
