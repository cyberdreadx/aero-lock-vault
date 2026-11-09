// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LPLocker} from "../locker/LPLocker.sol";

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

interface IPoolMin {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

/// The v2 LPLocker against real pools on a Base mainnet fork: a legacy Aerodrome pool and a
/// new Aero pool. Skipped unless RUN_FORK=true:
///   RUN_FORK=true FOUNDRY_PROFILE=locker forge test -vv
contract LockerForkTest is Test {
    address constant LEGACY_WETH_USDC = 0xcDAC0d6c6C59727a65F871236188350531885C43; // Aerodrome
    address constant AERO_WETH_USDC = 0x800EB395B577B234C5065c8E0cCb0F3A1401B2c2; // Aero (vAMMV2)
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    address owner = makeAddr("aerolock-fork-owner");
    address feeReceiver = makeAddr("aerolock-fork-fee-receiver");
    bool forked;

    function setUp() public {
        if (!vm.envOr("RUN_FORK", false)) return;
        vm.createSelectFork(vm.envOr("BASE_RPC", string("https://base-rpc.publicnode.com")));
        forked = true;
    }

    function test_fork_legacyAerodromePoolFees() public {
        vm.skip(!forked);
        _lockTradeClaim(LEGACY_WETH_USDC);
    }

    function test_fork_aeroPoolFees() public {
        vm.skip(!forked);
        _lockTradeClaim(AERO_WETH_USDC);
    }

    function _lockTradeClaim(address pool) internal {
        LPLocker locker = new LPLocker(pool, owner, feeReceiver);
        assertEq(locker.VERSION(), 2);

        deal(pool, owner, 1e15);
        vm.startPrank(owner);
        IERC20Min(pool).approve(address(locker), 1e15);
        bytes32 lockId = locker.lockLiquidity(1e15);
        vm.stopPrank();
        assertEq(IERC20Min(pool).balanceOf(address(locker)), 1e15);

        // trade both ways so both tokens accrue fees
        for (uint256 i; i < 3; i++) {
            vm.roll(block.number + 1);
            _swap(pool, WETH, 20 ether);
            vm.roll(block.number + 1);
            _swap(pool, USDC, IERC20Min(USDC).balanceOf(address(this)));
        }

        uint256 w0 = IERC20Min(WETH).balanceOf(feeReceiver);
        uint256 u0 = IERC20Min(USDC).balanceOf(feeReceiver);
        vm.prank(makeAddr("anyone"));
        locker.claimLPFees(lockId);
        uint256 gotWeth = IERC20Min(WETH).balanceOf(feeReceiver) - w0;
        uint256 gotUsdc = IERC20Min(USDC).balanceOf(feeReceiver) - u0;
        emit log_named_uint("fee receiver got WETH", gotWeth);
        emit log_named_uint("fee receiver got USDC", gotUsdc);
        assertGt(gotWeth + gotUsdc, 0, "trading fees reached the fee receiver");
        assertEq(IERC20Min(pool).balanceOf(address(locker)), 1e15, "LP still locked");
        assertEq(IERC20Min(WETH).balanceOf(address(locker)), 0, "nothing left behind");
        assertEq(IERC20Min(USDC).balanceOf(address(locker)), 0, "nothing left behind");
    }

    function _swap(address pool, address tokenIn, uint256 amountIn) internal {
        if (tokenIn == WETH) deal(WETH, address(this), amountIn);
        // ask for a little less than quoted: Aero pools may add an MEV tax on top of the fee
        uint256 out = (IPoolMin(pool).getAmountOut(amountIn, tokenIn) * 95) / 100;
        IERC20Min(tokenIn).transfer(pool, amountIn);
        bool zeroIn = tokenIn == IPoolMin(pool).token0();
        IPoolMin(pool).swap(zeroIn ? 0 : out, zeroIn ? out : 0, address(this), "");
    }
}
