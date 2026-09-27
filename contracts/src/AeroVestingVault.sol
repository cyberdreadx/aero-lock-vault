// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IAerodromePool} from "./interfaces/IAerodrome.sol";

/// @title AeroVestingVault
/// @notice Holds one lock of one token and releases it to its owner on a fixed schedule.
///         Deployed as a minimal clone by AeroLockFactory, which deposits the tokens.
///
///         Schedules (all times are unix seconds, `start` is when the lock was created):
///         - Fixed:       everything unlocks at `cliff`. The owner may push `cliff` later, never earlier.
///         - CliffLinear: nothing until `cliff`, then unlocks linearly over `duration` seconds.
///         - Steps:       `steps` equal parts, one every `duration` seconds after `start`.
///
///         Nobody - not the owner, not the factory or its admin - can take tokens out faster
///         than the schedule allows. There is no upgrade path.
contract AeroVestingVault is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Kind {
        Fixed,
        CliffLinear,
        Steps
    }

    struct Schedule {
        Kind kind;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint32 steps;
    }

    /// @notice The factory that created and funded this vault. An immutable of the
    ///         implementation, so every clone shares it and only the factory can initialize.
    address public immutable factory;
    /// @notice The locked token (an Aerodrome LP token or any ERC-20).
    IERC20 public token;
    /// @notice True when `token` is an Aerodrome v2 pool, so trading fees can be claimed.
    bool public isLP;
    /// @notice Receives released tokens and controls the vault.
    address public owner;
    /// @notice Proposed new owner; must call acceptOwnership.
    address public pendingOwner;
    /// @notice Receives claimed Aerodrome LP fees.
    address public feeReceiver;
    /// @notice Amount actually received at creation (fee-on-transfer safe).
    uint256 public total;
    /// @notice Amount already released to the owner.
    uint256 public released;
    Schedule internal _schedule;

    event Released(address indexed to, uint256 amount);
    event UnlockExtended(uint64 previousUnlock, uint64 newUnlock);
    event FeesClaimed(address indexed receiver, uint256 amount0, uint256 amount1);
    event FeeReceiverChanged(address indexed feeReceiver);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotFactory();
    error NotPendingOwner();
    error ZeroAddress();
    error NothingToRelease();
    error NotFixedSchedule();
    error UnlockNotLater();
    error NotLP();
    error CannotRecoverLockedToken();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        factory = msg.sender;
        // the implementation itself is never used as a vault
        _disableInitializers();
    }

    /// @dev Called once by the factory right after it clones and funds the vault.
    function initialize(
        IERC20 token_,
        address owner_,
        address feeReceiver_,
        bool isLP_,
        uint256 total_,
        Schedule calldata schedule_
    ) external initializer {
        if (msg.sender != factory) revert NotFactory();
        if (owner_ == address(0) || feeReceiver_ == address(0) || address(token_) == address(0)) revert ZeroAddress();
        token = token_;
        owner = owner_;
        feeReceiver = feeReceiver_;
        isLP = isLP_;
        total = total_;
        _schedule = schedule_;
        emit OwnershipTransferred(address(0), owner_);
    }

    // ------------------------------------------------------------------ views

    function schedule() external view returns (Schedule memory) {
        return _schedule;
    }

    /// @notice Amount unlocked by the schedule at `timestamp` (released or not).
    function vestedAmount(uint64 timestamp) public view returns (uint256) {
        Schedule memory s = _schedule;
        if (s.kind == Kind.Fixed) {
            return timestamp >= s.cliff ? total : 0;
        }
        if (s.kind == Kind.CliffLinear) {
            if (timestamp < s.cliff) return 0;
            uint256 elapsed = timestamp - s.cliff;
            return elapsed >= s.duration ? total : Math.mulDiv(total, elapsed, s.duration);
        }
        // Steps
        if (timestamp < s.start) return 0;
        uint256 done = (timestamp - s.start) / s.duration;
        return done >= s.steps ? total : Math.mulDiv(total, done, s.steps);
    }

    /// @notice When the last tokens unlock.
    function fullyUnlockedAt() public view returns (uint64) {
        Schedule memory s = _schedule;
        if (s.kind == Kind.Fixed) return s.cliff;
        if (s.kind == Kind.CliffLinear) return s.cliff + s.duration;
        return s.start + s.duration * s.steps;
    }

    /// @notice Unlocked and not yet released.
    function releasable() public view returns (uint256) {
        uint256 vested = vestedAmount(uint64(block.timestamp));
        // a Fixed lock extended after release can be "vested" below what was already paid out
        return vested > released ? vested - released : 0;
    }

    /// @notice Tokens still held by the schedule (not yet unlocked).
    function stillLocked() external view returns (uint256) {
        return total - vestedAmount(uint64(block.timestamp));
    }

    // ------------------------------------------------------------- owner actions

    /// @notice Sends everything the schedule has unlocked so far to the owner.
    function release() external onlyOwner nonReentrant {
        uint256 amount = releasable();
        // never try to send more than is held (e.g. a token that shrinks balances)
        uint256 held = token.balanceOf(address(this));
        if (amount > held) amount = held;
        if (amount == 0) revert NothingToRelease();
        released += amount;
        token.safeTransfer(owner, amount);
        emit Released(owner, amount);
    }

    /// @notice Pushes a Fixed lock's unlock time later. It can never be moved earlier.
    function extendUnlock(uint64 newUnlock) external onlyOwner {
        Schedule storage s = _schedule;
        if (s.kind != Kind.Fixed) revert NotFixedSchedule();
        if (newUnlock <= s.cliff) revert UnlockNotLater();
        emit UnlockExtended(s.cliff, newUnlock);
        s.cliff = newUnlock;
    }

    function setFeeReceiver(address newFeeReceiver) external onlyOwner {
        if (newFeeReceiver == address(0)) revert ZeroAddress();
        feeReceiver = newFeeReceiver;
        emit FeeReceiverChanged(newFeeReceiver);
    }

    /// @notice Recovers tokens sent here by mistake. Never the locked token.
    function recoverToken(IERC20 other, uint256 amount) external onlyOwner nonReentrant {
        if (address(other) == address(token)) revert CannotRecoverLockedToken();
        other.safeTransfer(owner, amount);
    }

    // ----------------------------------------------------------------- LP fees

    /// @notice Claims the locked LP's Aerodrome trading fees to `feeReceiver`. Anyone may call;
    ///         fees can only ever go to the fee receiver. The LP itself never moves.
    function claimFees() external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (!isLP) revert NotLP();
        IAerodromePool pool = IAerodromePool(address(token));
        pool.claimFees();
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        amount0 = token0.balanceOf(address(this));
        amount1 = token1.balanceOf(address(this));
        if (amount0 > 0) token0.safeTransfer(feeReceiver, amount0);
        if (amount1 > 0) token1.safeTransfer(feeReceiver, amount1);
        emit FeesClaimed(feeReceiver, amount0, amount1);
    }

    // --------------------------------------------------------------- ownership

    /// @notice Starts a two-step ownership transfer; `newOwner` must accept.
    ///         There is deliberately no renounce: an ownerless vault could never be released.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}
