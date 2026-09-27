// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AeroVestingVault} from "./AeroVestingVault.sol";
import {IAerodromePoolFactory} from "./interfaces/IAerodrome.sol";

/// @title AeroLockFactory
/// @notice Creates timed and vesting locks. Each lock is its own AeroVestingVault clone, so
///         funds are never pooled across locks. The creation fee is paid in the same
///         transaction. The factory owner can only change the fee and treasury - it has no
///         access to any vault or locked tokens.
contract AeroLockFactory is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Longest schedule accepted (keeps timestamps far from overflow).
    uint64 public constant MAX_SPAN = 100 * 365 days;
    uint32 public constant MAX_STEPS = 1000;

    /// @notice Vault logic every lock clones.
    address public immutable implementation;
    /// @notice Aerodrome v2 pool factory, used to recognise LP tokens.
    IAerodromePoolFactory public immutable aerodromeFactory;

    /// @notice Receives creation fees.
    address public treasury;
    /// @notice Creation fee in wei.
    uint256 public fee;
    /// @notice Wallets that create locks without paying the fee.
    mapping(address => bool) public feeExempt;

    address[] internal _vaults;
    mapping(address => address[]) internal _vaultsByOwner;

    struct CreateParams {
        IERC20 token;
        uint256 amount;
        /// receives released tokens and controls the vault
        address owner;
        /// receives LP fees; zero means `owner`
        address feeReceiver;
        AeroVestingVault.Kind kind;
        /// Fixed: unlock timestamp
        uint64 unlockTime;
        /// CliffLinear: seconds from now until the cliff
        uint64 cliffDuration;
        /// CliffLinear: linear unlock length after the cliff. Steps: seconds between steps
        uint64 duration;
        /// Steps: number of equal parts
        uint32 steps;
    }

    event LockCreated(
        address indexed vault,
        address indexed token,
        address indexed owner,
        address creator,
        uint256 amount,
        bool isLP,
        AeroVestingVault.Kind kind,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint32 steps
    );
    event FeeChanged(uint256 fee);
    event TreasuryChanged(address treasury);
    event FeeExemptChanged(address indexed account, bool exempt);

    error WrongFee(uint256 expected, uint256 sent);
    error FeeTransferFailed();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidSchedule();
    error NothingReceived();

    constructor(address initialOwner, address treasury_, uint256 fee_, IAerodromePoolFactory aerodromeFactory_)
        Ownable(initialOwner)
    {
        if (treasury_ == address(0) || address(aerodromeFactory_) == address(0)) revert ZeroAddress();
        implementation = address(new AeroVestingVault());
        aerodromeFactory = aerodromeFactory_;
        treasury = treasury_;
        fee = fee_;
        emit TreasuryChanged(treasury_);
        emit FeeChanged(fee_);
    }

    /// @notice Locks `p.amount` of `p.token` from the caller under the given schedule.
    ///         Send exactly `fee` wei (0 for fee-exempt callers). Approve the factory first.
    function createLock(CreateParams calldata p) external payable nonReentrant returns (address vault) {
        uint256 expected = feeExempt[msg.sender] ? 0 : fee;
        if (msg.value != expected) revert WrongFee(expected, msg.value);
        if (address(p.token) == address(0) || p.owner == address(0)) revert ZeroAddress();
        if (p.amount == 0) revert ZeroAmount();

        AeroVestingVault.Schedule memory s = _buildSchedule(p);
        bool isLP = _isAerodromePool(address(p.token));

        vault = Clones.clone(implementation);

        // record what actually arrived, so fee-on-transfer tokens can't overstate the lock
        uint256 before = p.token.balanceOf(vault);
        p.token.safeTransferFrom(msg.sender, vault, p.amount);
        uint256 received = p.token.balanceOf(vault) - before;
        if (received == 0) revert NothingReceived();

        address feeReceiver = p.feeReceiver == address(0) ? p.owner : p.feeReceiver;
        AeroVestingVault(vault).initialize(p.token, p.owner, feeReceiver, isLP, received, s);

        _vaults.push(vault);
        _vaultsByOwner[p.owner].push(vault);
        emit LockCreated(
            vault, address(p.token), p.owner, msg.sender, received, isLP, s.kind, s.start, s.cliff, s.duration, s.steps
        );

        if (msg.value > 0) {
            (bool ok,) = treasury.call{value: msg.value}("");
            if (!ok) revert FeeTransferFailed();
        }
    }

    // -------------------------------------------------------------------- views

    function vaultCount() external view returns (uint256) {
        return _vaults.length;
    }

    function vaultAt(uint256 index) external view returns (address) {
        return _vaults[index];
    }

    /// @notice Vaults created for `owner_` (by initial owner; ownership can move later).
    function vaultsOf(address owner_) external view returns (address[] memory) {
        return _vaultsByOwner[owner_];
    }

    // -------------------------------------------------------------------- admin

    function setFee(uint256 fee_) external onlyOwner {
        fee = fee_;
        emit FeeChanged(fee_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryChanged(treasury_);
    }

    function setFeeExempt(address account, bool exempt) external onlyOwner {
        feeExempt[account] = exempt;
        emit FeeExemptChanged(account, exempt);
    }

    // ------------------------------------------------------------------ internal

    function _buildSchedule(CreateParams calldata p) internal view returns (AeroVestingVault.Schedule memory s) {
        uint64 nowTs = uint64(block.timestamp);
        s.kind = p.kind;
        // start is always "now": a lock can't be backdated into being already unlocked
        s.start = nowTs;

        if (p.kind == AeroVestingVault.Kind.Fixed) {
            if (p.unlockTime <= nowTs || p.unlockTime - nowTs > MAX_SPAN) revert InvalidSchedule();
            s.cliff = p.unlockTime;
        } else if (p.kind == AeroVestingVault.Kind.CliffLinear) {
            if (p.duration == 0 || uint256(p.cliffDuration) + p.duration > MAX_SPAN) revert InvalidSchedule();
            s.cliff = nowTs + p.cliffDuration;
            s.duration = p.duration;
        } else {
            if (p.duration == 0 || p.steps == 0 || p.steps > MAX_STEPS) revert InvalidSchedule();
            if (uint256(p.duration) * p.steps > MAX_SPAN) revert InvalidSchedule();
            s.duration = p.duration;
            s.steps = p.steps;
        }
    }

    function _isAerodromePool(address token) internal view returns (bool) {
        try aerodromeFactory.isPool(token) returns (bool yes) {
            return yes;
        } catch {
            return false;
        }
    }
}
