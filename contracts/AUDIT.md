# AeroLock audit package

AeroLock locks tokens and Aerodrome / Aero LP on Base. This document is the brief for an
independent security review: what is in scope, how it works, what must always hold, and what
we already know.

- Repository: https://github.com/cyberdreadx/aero-lock-vault (contracts in `contracts/`)
- Chain: Base mainnet (8453)
- Contact: the AeroLock team via the repository owner

## Scope

| File | nSLOC | Compiler | Purpose |
| --- | ---: | --- | --- |
| `src/AeroLockFactory.sol` | 264 | 0.8.24, cancun, optimizer 200 | Creates timed / vesting locks (one clone per lock), takes a USD fee priced via Chainlink, team batches |
| `src/AeroVestingVault.sol` | 155 | 0.8.24, cancun, optimizer 200 | One lock: holds one token, releases it to its owner on a schedule, claims LP fees |
| `src/interfaces/IAerodrome.sol` | 10 | 0.8.24 | Pool / factory interfaces |
| `src/interfaces/IChainlink.sol` | 8 | 0.8.24 | Price feed interface |
| `locker/LPLocker.sol` (contract `LPLocker` only) | 268 | 0.8.20, shanghai, optimizer **off** | The original "30-day notice" locker, v2. Deployed once per customer |
| **Total** | **~705** | | |

Out of scope: OpenZeppelin v5 libraries (flattened into `locker/LPLocker.sol`, imported in
`src/`), tests, scripts, the web app and edge functions.

## Deployed contracts

| Contract | Address | Status |
| --- | --- | --- |
| AeroLockFactory **v3** (current) | `0xFff823F3c8c83dD976fc54D33750e893D6739a50` | verified (Basescan, Sourcify exact) |
| AeroVestingVault logic **v3** | `0x02c47971F88e7c471e7DBf6711888669693a522F` | verified |
| AeroLockFactory v2 (no Aero pools) | `0xE31833bD08d8833a621a042F0Cc27E0ACa1B4d50` | live, superseded |
| AeroLockFactory v1 (no batches) | `0x07E05724Be95Ea989F66471F822fB489aCFb83ea` | live, superseded |
| LPLocker v2 | one per customer, created by the app | runtime fingerprint (token immutable zeroed) `0xaecd41b9…da82c` |
| LPLocker v1 (6 deployed) | various | legacy-Aerodrome-only fee claiming |

Factories are deployed through the deterministic CREATE2 deployer
`0x4e59b44847b379578588920cA78FbF26c0B4956C` with fixed salts, so their addresses are fixed by
code and constructor arguments. Owner and treasury: `0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e`
(a Coinbase smart wallet).

## How it works

### Timed and vesting locks (`AeroLockFactory` + `AeroVestingVault`)

1. The creator approves the factory and calls `createLock(params)`, or `createLocks(params[],
   label)` for up to 40 locks at once (a team).
2. The factory validates the schedule, clones the vault logic (EIP-1167), transfers the tokens
   **straight into the clone**, measures what actually arrived (fee-on-transfer safe),
   initializes the clone, and records it.
3. The fee is `feeUsd` (one lock) or `feeUsd + feePerExtraLockUsd * (n - 1)` (batch), converted
   to wei at Chainlink's ETH/USD price, rounded up. Excess `msg.value` is refunded in the same
   call. Fee-exempt wallets pay nothing.
4. Each vault releases to its owner per its schedule:
   - **Fixed**: everything at `cliff`. Owner may move `cliff` later, never earlier.
   - **CliffLinear**: nothing before `cliff`, then linear over `duration`.
   - **Steps**: `steps` equal parts, one every `duration` seconds from `start`.
5. LP vaults can claim trading fees to `feeReceiver` (anyone can trigger). Aero pools are
   claimed with `claimFees(feeReceiver)`; legacy Aerodrome pools have no such function, so the
   call reverts and the vault falls back to `claimFees()` and forwards the tokens.

### 30-day-notice locker (`LPLocker`)

One contract per customer and token. The owner locks amounts (each gets a `lockId`), may top
them up, and can withdraw only after calling `triggerWithdrawal` and waiting 30 days; the
trigger can be cancelled. Fees are claimed to `feeReceiver` the same way as above (v2).

## Roles and trust

| Role | Can | Cannot |
| --- | --- | --- |
| Factory owner (2-step) | set `feeUsd`, `feePerExtraLockUsd`, `treasury`, fee exemptions, max price age (1 min - 1 day) | touch any vault or locked tokens; change schedules; upgrade anything |
| Vault owner (2-step, no renounce) | release unlocked tokens, extend a Fixed unlock, set fee receiver, recover other tokens, hand the lock to another wallet | take tokens faster than the schedule; recover the locked token |
| Anyone | create locks, trigger fee claims (fees only go to `feeReceiver`) | anything else |
| LPLocker owner | lock, top up, trigger / cancel withdrawal, withdraw after 30 days, set fee receiver, recover other tokens | withdraw without the 30-day notice; recover the locked token |

Nothing is upgradeable. The only external trust is in the token being locked, the Aerodrome /
Aero pool contracts, Chainlink, and Base's sequencer.

## Invariants (what must always hold)

1. A vault's owner can never receive more than `vestedAmount(now)` of the locked token, and no
   one else can ever receive it.
2. `vestedAmount` never decreases over time (except a Fixed lock being extended before unlock)
   and never exceeds `total`; at `fullyUnlockedAt()` it equals `total`.
3. The factory never holds tokens or ETH after a call returns.
4. A batch is all-or-nothing.
5. A vault can be initialized only once, only by its factory.
6. LP fees can only ever reach `feeReceiver`; the LP itself never moves in a fee claim.
7. The fee charged is never below `feeUsd` at the current price; a stale price, a down
   sequencer, or a sequencer within an hour of restarting blocks creation instead.
8. An `LPLocker` lock can only be withdrawn 30 days or more after a trigger that was not
   cancelled.

## Areas we would most like reviewed

- The `try claimFees(recipient) / catch claimFees()` fallback in both the vault and LPLocker v2,
  against legacy Aerodrome pools, Aero pools, and hostile pool-like tokens.
- Fee pricing, rounding, refunds and the Chainlink / sequencer checks.
- `createLocks` batches (gas, partial failure, label handling, accounting).
- Clone initialization: the token is transferred before `initialize`; `initialize` is restricted
  to the factory via an immutable shared by all clones.
- Schedule maths and bounds (`MAX_SPAN`, `MAX_STEPS`, overflow, `mulDiv`).
- Fee-on-transfer, rebasing and other unusual ERC-20s.
- The app appends `"aeref:" + address` to `createLock`/`createLocks` calldata for affiliate
  tracking; the factory must ignore trailing calldata (there is a test).

## Tests

```shell
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
forge test                                               # 56 unit + fuzz (2,000 runs each)
RUN_FORK=true forge test --match-contract Fork -vv       # real Base: legacy pool, Aero pool, Chainlink
RUN_FORK=true FOUNDRY_PROFILE=locker forge test -vv      # LPLocker v2 on a legacy and an Aero pool
```

Coverage (`forge coverage`, timed-lock contracts): 98.6% lines, 97.5% statements, 88.7%
branches, 100% functions. LPLocker v2 is covered by the two fork tests (real fees claimed on a
legacy and an Aero pool); its logic otherwise matches v1, which has run in production since 2025.

## Static analysis

Run on the current code with Slither 0.11.6 and Aderyn (latest). Every finding was reviewed:

| Tool | Finding | Where | Verdict |
| --- | --- | --- | --- |
| Slither (High) | arbitrary-send-eth | factory `_settleFee` | By design: sends the fee to the owner-set treasury and the refund to `msg.sender`. |
| Slither (High) | unchecked-transfer | LPLocker `updateClaimableFees` | Zero-amount self-transfer inside `try`, only to trigger fee accounting. Harmless. |
| Aderyn (High) | state change after external call | factory constructor | Reads `decimals()` from the Chainlink feed at deploy. Trusted, constructor only. |
| Aderyn (High) | state change after external call | vault `release` | The external call is a `balanceOf` read; `released` is updated before the transfer, and the function is `nonReentrant`. |
| Aderyn (High) | weak randomness | LPLocker `lockLiquidity` | `keccak256(sender, amount, timestamp, nonce)` is a unique id, not randomness. |
| Slither (Medium) | incorrect-equality | `amount == 0` / `received == 0` checks | Intended guards. |
| Slither (Medium) | unused-return | legacy `claimFees()`, `latestRoundData` | Legacy path measures balances instead; unused Chainlink fields are `roundId` / `answeredInRound`. |
| Slither (Medium) | uninitialized-local | LPLocker `claimLPFees` amounts | Assigned in both the `try` and `catch` branches. False positive. |
| Slither / Aderyn (Low) | missing zero check | LPLocker constructor `feeReceiver_` | **Real, low.** A zero fee receiver would make fee claims revert until the owner sets one (`changeFeeReceiver` rejects zero). Mitigated in the app, which now refuses a zero address; to be fixed in the contract with any audit fixes. |
| Both (Low) | calls / reverts in loop | `createLocks` | Intended: batches are all-or-nothing and capped at 40 locks (~12.7M gas). |
| Slither (Low) | reentrancy-benign / events | `_createLock`, `claimLPFees` | Guarded by `nonReentrant` or no exploitable state. |
| Slither (Low) | timestamp | schedules, price age | Inherent to time locks; second-level drift is irrelevant. |
| Aderyn (Low) | centralization | factory owner | Owner controls fees only; see Roles. |
| Aderyn (Low) | state change without event | vault `recoverToken` | Informational. |
| Slither (Info) | unindexed event address | `TreasuryChanged` | Informational. |

## Known issues and accepted risks

- `LPLocker` does not reject a zero `feeReceiver_` in its constructor (see above).
- If Chainlink's feed is stale or the sequencer is down, lock creation pauses (by design).
- A token that reverts transfers, blacklists the vault, or rebases downward can trap or shrink a
  lock; `release` never sends more than the vault holds.
- Superseded factories (v1, v2) and LPLocker v1 remain live for existing locks; they share this
  design minus Aero fee claiming (and, for v1, batches).
