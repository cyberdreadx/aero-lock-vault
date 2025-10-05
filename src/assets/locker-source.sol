/**
 *Submitted for verification at basescan.org on 2025-06-05
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// src/interfaces/IAerodromePool.sol

interface IAerodromePool {
    function claimFees() external returns (uint256 claimed0, uint256 claimed1);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1, uint256 _blockTimestampLast);
    function stable() external view returns (bool);
    function factory() external view returns (address);
    /// @notice Returns the amount of token0 claimable by a user
    function claimable0(address user) external view returns (uint256);
    /// @notice Returns the amount of token1 claimable by a user  
    function claimable1(address user) external view returns (uint256);
    /// @notice Global fee index for token0 (total fees accumulated per unit of total supply)
    function index0() external view returns (uint256);
    /// @notice Global fee index for token1 (total fees accumulated per unit of total supply)
    function index1() external view returns (uint256);
    /// @notice User's last recorded fee index for token0 when they last claimed/interacted
    function supplyIndex0(address user) external view returns (uint256);
    /// @notice User's last recorded fee index for token1 when they last claimed/interacted
    function supplyIndex1(address user) external view returns (uint256);
    /// @notice Transfers 0 tokens to trigger fee updates (available in real Aerodrome contracts)
    function transfer(address to, uint256 amount) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

// src/interfaces/ILPLocker.sol

/**
 * @title ILPLocker
 * @notice Interface for LPLocker events, custom errors, and external functions
 */
interface ILPLocker {
    /// @notice Emitted when liquidity is locked
    /// @param lockId The ID of the lock
    /// @param amount The amount of LP tokens locked
    event LiquidityLocked(bytes32 lockId, uint256 amount);
    /// @notice Emitted when withdrawal is triggered
    /// @param lockId The ID of the lock
    /// @param unlockTime The timestamp when withdrawal becomes available
    event WithdrawalTriggered(bytes32 lockId, uint256 unlockTime);
    /// @notice Emitted when withdrawal trigger is cancelled
    /// @param lockId The ID of the lock
    event WithdrawalCancelled(bytes32 lockId);
    /// @notice Emitted when LP tokens are withdrawn
    /// @param lockId The ID of the lock
    /// @param amount The amount of LP tokens withdrawn
    event LPWithdrawn(bytes32 indexed lockId, uint256 amount);
    /// @notice Emitted when LP fees are claimed
    /// @param lockId The ID of the lock
    /// @param token0 The address of token0 in the LP
    /// @param amount0 The amount of token0 claimed
    /// @param token1 The address of token1 in the LP
    /// @param amount1 The amount of token1 claimed
    event FeesClaimed(bytes32 indexed lockId, address token0, uint256 amount0, address token1, uint256 amount1);
    /// @notice Emitted when the fee receiver is changed
    /// @param newFeeReceiver The new fee receiver address
    event FeeReceiverChanged(address indexed newFeeReceiver);
    /// @notice Emitted when the lock is fully withdrawn and deleted
    /// @param lockId The ID of the lock
    event LockFullyWithdrawn(bytes32 indexed lockId);
    /// @notice Emitted when claimable fees are updated
    /// @param lockId The ID of the lock
    event ClaimableFeesUpdated(bytes32 indexed lockId);

    /// @notice Thrown when attempting to set owner to the zero address
    error CannotAssignOwnerToAddressZero();
    /// @notice Thrown when attempting to withdraw before the lockup ends
    error LockupNotEnded();
    /// @notice Thrown when attempting to lock liquidity that is already locked
    error LPAlreadyLocked();
    /// @notice Thrown when attempting to act when liquidity is not locked
    error LPNotLocked();
    /// @notice Thrown when a non-owner attempts a restricted action
    error OnlyOwnerCanCall();
    /// @notice Thrown when attempting to trigger withdrawal before 2 years
    error TwoYearMinimum();
    /// @notice Thrown when withdrawal is already triggered
    error WithdrawalAlreadyTriggered();
    /// @notice Thrown when withdrawal is not triggered but required
    error WithdrawalNotTriggered();
    /// @notice Thrown when attempting to lock zero LP tokens
    error LPAmountZero();
    /// @notice Thrown when attempting to set the owner to the zero address
    error OwnerCannotBeZeroAddress();
    /// @notice Thrown when attempting to set the fee receiver to the zero address
    error FeeReceiverCannotBeZeroAddress();
    /// @notice Thrown when attempting to set the token contract to the zero address
    error TokenContractCannotBeZeroAddress();
    /// @notice Thrown when attempting to recover the locked LP token
    error CannotRecoverLPToken();
    /// @notice Thrown when the LP token doesn't support fee updates
    error UpdateNotSupported();

    /**
     * @notice Locks a specified amount of LP tokens in the contract
     * @dev Only callable by the owner. Can only be called once until all tokens are withdrawn.
     * @param amount The amount of LP tokens to lock
     * @return lockId The ID of the lock
     * @custom:error LPAlreadyLocked if already locked, LPAmountZero if amount is zero
     */
    function lockLiquidity(uint256 amount) external returns (bytes32 lockId);

    /**
     * @notice Triggers the timelocked withdrawal
     * @dev Only callable by the owner if liquidity is locked and not already triggered
     * @param lockId The ID of the lock
     * @custom:error LPNotLocked if not locked, WithdrawalAlreadyTriggered if already triggered
     */
    function triggerWithdrawal(bytes32 lockId) external;

    /**
     * @notice Cancels the withdrawal trigger, resetting the timelock
     * @dev Only callable by the owner if withdrawal is triggered
     * @param lockId The ID of the lock
     * @custom:error LPNotLocked if not locked, WithdrawalNotTriggered if not triggered
     */
    function cancelWithdrawalTrigger(bytes32 lockId) external;

    /**
     * @notice Withdraws a specified amount of LP tokens during the withdrawal window
     * @dev Only callable by the owner during the timelock. Resets state if all tokens withdrawn.
     * @param lockId The ID of the lock
     * @param amount The amount of LP tokens to withdraw
     * @custom:error LPNotLocked if not locked, WithdrawalNotTriggered if not triggered, LockupNotEnded if timelock not complete
     */
    function withdrawLP(bytes32 lockId, uint256 amount) external;

    /**
     * @notice Changes the fee receiver
     * @dev Only callable by the owner
     * @param newFeeReceiver The new fee receiver address
     * @custom:error FeeReceiverCannotBeZeroAddress if new fee receiver is zero address
     */
    function changeFeeReceiver(address newFeeReceiver) external;

    /**
     * @notice Claims LP fees from the pool and sends them to the fee receiver
     * @dev Can be called by anyone when liquidity is locked. Fees always go to the designated fee receiver.
     * @param lockId The ID of the lock
     * @custom:error LPNotLocked if not locked
     */
    function claimLPFees(bytes32 lockId) external;

    /**
     * @notice Updates the claimable fees by triggering fee tracking update
     * @dev Can be called by anyone when liquidity is locked. Triggers _updateFor() in Aerodrome contracts.
     * @param lockId The ID of the lock
     * @custom:error LPNotLocked if not locked, UpdateNotSupported if LP doesn't support updates
     */
    function updateClaimableFees(bytes32 lockId) external;

    /**
     * @notice Returns all relevant lock state information for monitoring
     * @return owner_ The current owner
     * @return feeReceiver_ The current fee receiver
     * @return tokenContract_ The address of the locked LP token
     * @return lockedAmount_ The amount of LP tokens locked
     * @return lockUpEndTime_ The time when the timelock ends (0 if not triggered)
     * @return isLiquidityLocked_ True if liquidity is currently locked
     * @return isWithdrawalTriggered_ True if withdrawal has been triggered
     */
    function getLockInfo(bytes32 lockId)
        external
        view
        returns (
            address owner_,
            address feeReceiver_,
            address tokenContract_,
            uint256 lockedAmount_,
            uint256 lockUpEndTime_,
            bool isLiquidityLocked_,
            bool isWithdrawalTriggered_
        );

    /**
     * @notice Returns the current LP token balance held by the contract
     * @return lpBalance The LP token balance
     */
    function getLPBalance() external view returns (uint256 lpBalance);

    /**
     * @notice Returns the unlock time for the withdrawal window
     * @param lockId The ID of the lock
     * @return lockUpEndTime_ The time when the timelock ends (0 if not triggered)
     */
    function getUnlockTime(bytes32 lockId) external view returns (uint256 lockUpEndTime_);

    /**
     * @notice Returns the amount of fees claimable from the Aerodrome LP pool for a given lock.
     * @dev This reads the current claimable amounts directly from the pool contract.
     * @param lockId The ID of the lock
     * @return token0 The address of token0 in the LP
     * @return amount0 The amount of token0 claimable
     * @return token1 The address of token1 in the LP
     * @return amount1 The amount of token1 claimable
     */
    function getClaimableFees(bytes32 lockId)
        external
        view
        returns (address token0, uint256 amount0, address token1, uint256 amount1);

    /**
     * @notice Returns the total accumulated fees (based on index difference) for a given lock
     * @dev Total accumulated = (current global index - user's last index) * user's LP balance / total supply
     * @param lockId The ID of the lock
     * @return token0 The address of token0 in the LP
     * @return totalAmount0 The total amount of token0 that has accumulated since last update
     * @return token1 The address of token1 in the LP
     * @return totalAmount1 The total amount of token1 that has accumulated since last update
     */
    function getTotalAccumulatedFees(bytes32 lockId)
        external
        view
        returns (address token0, uint256 totalAmount0, address token1, uint256 totalAmount1);

    /**
     * @notice External view function to calculate index-based fees (for try-catch)
     * @dev This needs to be external to be called with try-catch. Returns 0,0 if LP doesn't support index-based fees.
     * @param pool The Aerodrome pool interface
     * @return totalAmount0 The total amount of token0 accumulated
     * @return totalAmount1 The total amount of token1 accumulated
     */
    function _calculateIndexBasedFeesView(IAerodromePool pool) external view returns (uint256 totalAmount0, uint256 totalAmount1);

    /**
     * @notice Tops up the locked LP tokens with additional amount
     * @dev Only callable by the owner when liquidity is already locked
     * @param amount The amount of LP tokens to add to the lock
     */
    function topUpLock(bytes32 lockId, uint256 amount) external;

    /**
     * @notice Recovers accidentally sent tokens (non-LP tokens only)
     * @dev Only callable by the owner. Cannot recover the locked LP token.
     * @param token The address of the token to recover
     * @param amount The amount of tokens to recover
     */
    function recoverToken(address token, uint256 amount) external;

    /**
     * @notice Returns all lock IDs for enumeration
     * @return An array of all lock IDs
     */
    function getAllLockIds() external view returns (bytes32[] memory);

    /**
     * @notice Checks if a lock exists
     * @param lockId The ID of the lock to check
     * @return True if the lock exists, false otherwise
     */
    function lockExists(bytes32 lockId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/access/Ownable2Step.sol

// OpenZeppelin Contracts (last updated v5.1.0) (access/Ownable2Step.sol)

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This extension of the {Ownable} contract includes a two-step mechanism to transfer
 * ownership, where the new owner must call {acceptOwnership} in order to replace the
 * old one. This can help prevent common mistakes, such as transfers of ownership to
 * incorrect accounts, or to contracts that are unable to interact with the
 * permission system.
 *
 * The initial owner is specified at deployment time in the constructor for `Ownable`. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */
abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     *
     * Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// src/LPLocker.sol

/**
 * @title LPLocker
 * @notice Locks an ERC20 LP Token, then allows a 30-day withdrawal window after a trigger. Supports Aerodrome LP fee claiming.
 * @dev Owner controls all lock operations (creation, triggering withdrawals, cancellation, and withdrawals). Anyone can update fees and claim fees (which go to the designated fee receiver).
 */
contract LPLocker is ILPLocker, Ownable2Step {
    using SafeERC20 for IERC20;

    struct Lock {
        uint256 amount;
        uint256 lockUpEndTime;
        bool isLiquidityLocked;
        bool isWithdrawalTriggered;
    }

    /// @notice The address that receives claimed LP fees
    address public feeReceiver;
    /// @notice The address of the locked LP token (must be Aerodrome LP for fee claiming)
    address public immutable tokenContract;
    /// @notice mapping of lock ID to lock info. Lock ID is a hash of the lock parameters.
    mapping(bytes32 => Lock) public locks;

    /// @notice The delay for the withdrawal window
    uint256 public constant WITHDRAW_DELAY = 30 days;

    mapping(address => uint256) private _nonces;
    
    /// @notice Array of all lock IDs for enumeration
    bytes32[] private _allLockIds;

    constructor(address tokenContract_, address owner_, address feeReceiver_) Ownable(owner_) {
        if (tokenContract_ == address(0)) {
            revert TokenContractCannotBeZeroAddress();
        }
        if (owner_ == address(0)) {
            revert OwnerCannotBeZeroAddress();
        }
        tokenContract = tokenContract_;
        feeReceiver = feeReceiver_;
    }

    // ----------- VIEW FUNCTIONS -----------

    /// @inheritdoc ILPLocker
    function getLockInfo(bytes32 lockId)
        external
        view
        override
        returns (
            address owner_,
            address feeReceiver_,
            address tokenContract_,
            uint256 amount_,
            uint256 lockUpEndTime_,
            bool isLiquidityLocked_,
            bool isWithdrawalTriggered_
        )
    {
        Lock memory lock = locks[lockId];
        return
            (owner(), feeReceiver, tokenContract, lock.amount, lock.lockUpEndTime, lock.isLiquidityLocked, lock.isWithdrawalTriggered);
    }

    /// @inheritdoc ILPLocker
    function getLPBalance() external view override returns (uint256 lpBalance) {
        return IERC20(tokenContract).balanceOf(address(this));
    }

    /// @inheritdoc ILPLocker
    function getUnlockTime(bytes32 lockId) external view returns (uint256 lockUpEndTime_) {
        return locks[lockId].lockUpEndTime;
    }

    /// @inheritdoc ILPLocker
    function getClaimableFees(bytes32 lockId)
        external
        view
        returns (address token0, uint256 amount0, address token1, uint256 amount1)
    {
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        IAerodromePool pool = IAerodromePool(tokenContract);
        token0 = pool.token0();
        token1 = pool.token1();
        amount0 = pool.claimable0(address(this));
        amount1 = pool.claimable1(address(this));
        return (token0, amount0, token1, amount1);
    }

    /// @notice Returns the total accumulated fees (based on index difference) for a given lock
    /// @dev Returns 0,0 if the LP token doesn't support index-based fee tracking
    /// @param lockId The ID of the lock
    /// @return token0 The address of token0 in the LP
    /// @return totalAmount0 The total amount of token0 that has accumulated since last update
    /// @return token1 The address of token1 in the LP
    /// @return totalAmount1 The total amount of token1 that has accumulated since last update
    function getTotalAccumulatedFees(bytes32 lockId)
        external
        view
        returns (address token0, uint256 totalAmount0, address token1, uint256 totalAmount1)
    {
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }

        IAerodromePool pool = IAerodromePool(tokenContract);
        
        // Try to get token addresses (these should always work for any LP)
        try pool.token0() returns (address _token0) {
            token0 = _token0;
        } catch {
            token0 = address(0);
        }
        
        try pool.token1() returns (address _token1) {
            token1 = _token1;
        } catch {
            token1 = address(0);
        }
        
        // Try to calculate index-based fees, return 0,0 if not supported
        try this._calculateIndexBasedFeesView(pool) returns (uint256 amount0, uint256 amount1) {
            totalAmount0 = amount0;
            totalAmount1 = amount1;
        } catch {
            // LP doesn't support index-based fees, return 0
            totalAmount0 = 0;
            totalAmount1 = 0;
        }
        
        return (token0, totalAmount0, token1, totalAmount1);
    }

    /// @notice External view function to calculate index-based fees (for try-catch)
    /// @dev This needs to be external to be called with try-catch
    function _calculateIndexBasedFeesView(IAerodromePool pool) external view returns (uint256 totalAmount0, uint256 totalAmount1) {
        uint256 userBalance = IERC20(tokenContract).balanceOf(address(this));
        uint256 totalSupply = IERC20(tokenContract).totalSupply();
        
        if (userBalance > 0 && totalSupply > 0) {
            uint256 currentIndex0 = pool.index0();
            uint256 currentIndex1 = pool.index1();
            uint256 userSupplyIndex0 = pool.supplyIndex0(address(this));
            uint256 userSupplyIndex1 = pool.supplyIndex1(address(this));
            
            uint256 index0Diff = currentIndex0 > userSupplyIndex0 ? currentIndex0 - userSupplyIndex0 : 0;
            uint256 index1Diff = currentIndex1 > userSupplyIndex1 ? currentIndex1 - userSupplyIndex1 : 0;
            
            totalAmount0 = (index0Diff * userBalance) / 1e18;
            totalAmount1 = (index1Diff * userBalance) / 1e18;
        }
        
        return (totalAmount0, totalAmount1);
    }

    // ----------- STATE-CHANGING FUNCTIONS -----------

    /// @inheritdoc ILPLocker
    function lockLiquidity(uint256 amount) external returns (bytes32 lockId) {
        _requireIsOwner();
        if (amount == 0) {
            revert LPAmountZero();
        }
        uint256 nonce = _nonces[msg.sender]++;
        lockId = keccak256(abi.encode(msg.sender, amount, block.timestamp, nonce));
        IERC20(tokenContract).safeTransferFrom(msg.sender, address(this), amount);
        locks[lockId] = Lock({
            amount: amount, 
            lockUpEndTime: 0, 
            isLiquidityLocked: true, 
            isWithdrawalTriggered: false
        });
        _allLockIds.push(lockId);
        emit LiquidityLocked(lockId, amount);
    }

    /// @inheritdoc ILPLocker
    function triggerWithdrawal(bytes32 lockId) external {
        _requireIsOwner();
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        if (lock.lockUpEndTime != 0) {
            revert WithdrawalAlreadyTriggered();
        }
        lock.lockUpEndTime = block.timestamp + WITHDRAW_DELAY;
        lock.isWithdrawalTriggered = true;
        locks[lockId] = lock;
        emit WithdrawalTriggered(lockId, lock.lockUpEndTime);
    }

    /// @inheritdoc ILPLocker
    function cancelWithdrawalTrigger(bytes32 lockId) external {
        _requireIsOwner();
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        if (lock.lockUpEndTime == 0) {
            revert WithdrawalNotTriggered();
        }
        lock.lockUpEndTime = 0;
        lock.isWithdrawalTriggered = false;
        locks[lockId] = lock;
        emit WithdrawalCancelled(lockId);
    }

    /// @inheritdoc ILPLocker
    function withdrawLP(bytes32 lockId, uint256 amount) external {
        _requireIsOwner();
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        if (lock.lockUpEndTime == 0) {
            revert WithdrawalNotTriggered();
        }
        if (block.timestamp < lock.lockUpEndTime) {
            revert LockupNotEnded();
        }
        lock.amount -= amount;
        locks[lockId] = lock;
        IERC20(tokenContract).safeTransfer(owner(), amount);
        if (lock.amount == 0) {
            delete locks[lockId];
            _removeLockId(lockId);
            emit LockFullyWithdrawn(lockId);
        }
        emit LPWithdrawn(lockId, amount);
    }

    /// @inheritdoc ILPLocker
    function changeFeeReceiver(address newFeeReceiver) external {
        _requireIsOwner();
        if (newFeeReceiver == address(0)) {
            revert FeeReceiverCannotBeZeroAddress();
        }
        feeReceiver = newFeeReceiver;
        emit FeeReceiverChanged(newFeeReceiver);
    }

    /// @inheritdoc ILPLocker
    function claimLPFees(bytes32 lockId) external {
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }

        IAerodromePool pool = IAerodromePool(tokenContract);
        
        // Then claim the fees
        (uint256 amount0, uint256 amount1) = pool.claimFees();
        address token0 = pool.token0();
        address token1 = pool.token1();
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        if (bal0 > 0) {
            IERC20(token0).safeTransfer(feeReceiver, bal0);
        }
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        if (bal1 > 0) {
            IERC20(token1).safeTransfer(feeReceiver, bal1);
        }
        emit FeesClaimed(lockId, token0, amount0, token1, amount1);
    }

    /// @inheritdoc ILPLocker
    function updateClaimableFees(bytes32 lockId) external {
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        
        IAerodromePool pool = IAerodromePool(tokenContract);
        
        // Try to trigger fee update by making a 0-transfer to ourselves
        // This calls _updateFor() internally in real Aerodrome contracts
        try pool.transfer(address(this), 0) {
            emit ClaimableFeesUpdated(lockId);
        } catch {
            // Not an Aerodrome LP or function not available
            revert UpdateNotSupported();
        }
    }

    /// @inheritdoc ILPLocker
    function topUpLock(bytes32 lockId, uint256 amount) external {
        _requireIsOwner();
        Lock memory lock = locks[lockId];
        if (!lock.isLiquidityLocked) {
            revert LPNotLocked();
        }
        if (lock.isWithdrawalTriggered) {
            revert WithdrawalAlreadyTriggered();
        }
        if (amount == 0) {
            revert LPAmountZero();
        }
        IERC20(tokenContract).safeTransferFrom(msg.sender, address(this), amount);
        lock.amount += amount;
        locks[lockId] = lock;
        emit LiquidityLocked(lockId, lock.amount);
    }

    /**
     * @notice Internal helper to check if msg.sender is the owner
     * @dev Reverts with OnlyOwnerCanCall if not owner
     */
    function _requireIsOwner() internal view {
        if (msg.sender != owner()) {
            revert OnlyOwnerCanCall();
        }
    }

    /// @inheritdoc ILPLocker
    function recoverToken(address token, uint256 amount) external {
        _requireIsOwner();
        if (token == tokenContract) {
            revert CannotRecoverLPToken();
        }
        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @inheritdoc ILPLocker
    function getAllLockIds() external view returns (bytes32[] memory) {
        return _allLockIds;
    }

    /// @inheritdoc ILPLocker
    function lockExists(bytes32 lockId) external view returns (bool) {
        return locks[lockId].isLiquidityLocked;
    }

    /**
     * @notice Internal helper to remove a lock ID from the tracking array
     * @param lockId The lock ID to remove
     */
    function _removeLockId(bytes32 lockId) internal {
        uint256 length = _allLockIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (_allLockIds[i] == lockId) {
                // Move the last element to this position and pop
                _allLockIds[i] = _allLockIds[length - 1];
                _allLockIds.pop();
                break;
            }
        }
    }
}