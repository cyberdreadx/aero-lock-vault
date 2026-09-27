// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice The parts of Aerodrome's v2 pool and pool factory the lockers use.
interface IAerodromePool {
    function claimFees() external returns (uint256 claimed0, uint256 claimed1);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IAerodromePoolFactory {
    function isPool(address pool) external view returns (bool);
}
