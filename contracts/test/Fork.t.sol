// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AeroLockFactory} from "../src/AeroLockFactory.sol";
import {AeroVestingVault} from "../src/AeroVestingVault.sol";
import {IAerodromePoolFactory} from "../src/interfaces/IAerodrome.sol";

interface IPoolSwap {
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

/// Runs against real Aerodrome contracts on a Base mainnet fork.
/// Skipped unless RUN_FORK=true:  RUN_FORK=true forge test --match-contract Fork
contract ForkTest is Test {
    IAerodromePoolFactory constant AERO_FACTORY = IAerodromePoolFactory(0x420DD381b31aEf6683db6B902084cB0FFECe40Da);
    address constant POOL = 0xcDAC0d6c6C59727a65F871236188350531885C43; // vAMM-WETH/USDC
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    AeroLockFactory factory;
    address alice = makeAddr("alice");
    address carol = makeAddr("carol");
    bool forked;

    function setUp() public {
        if (!vm.envOr("RUN_FORK", false)) return;
        vm.createSelectFork(vm.rpcUrl("base"));
        forked = true;
        factory = new AeroLockFactory(address(this), makeAddr("treasury"), 0, AERO_FACTORY);
    }

    function test_fork_realPoolLockEarnsAndClaimsFees() public {
        vm.skip(!forked);
        deal(POOL, alice, 1e15);
        uint256 lp = IERC20(POOL).balanceOf(alice);

        AeroLockFactory.CreateParams memory p;
        p.token = IERC20(POOL);
        p.amount = lp;
        p.owner = alice;
        p.feeReceiver = carol;
        p.kind = AeroVestingVault.Kind.Fixed;
        p.unlockTime = uint64(block.timestamp + 30 days);

        vm.startPrank(alice);
        IERC20(POOL).approve(address(factory), lp);
        AeroVestingVault v = AeroVestingVault(factory.createLock(p));
        vm.stopPrank();
        assertTrue(v.isLP(), "real pool recognised");
        assertEq(v.total(), lp);

        // trade through the pool so fees accrue to LP holders, including the vault
        for (uint256 i; i < 3; i++) {
            deal(WETH, address(this), 50 ether);
            uint256 out = IPoolSwap(POOL).getAmountOut(50 ether, WETH);
            IERC20(WETH).transfer(POOL, 50 ether);
            IPoolSwap(POOL).swap(0, out, address(this), "");
            uint256 usdc = IERC20(USDC).balanceOf(address(this));
            uint256 back = IPoolSwap(POOL).getAmountOut(usdc, USDC);
            IERC20(USDC).transfer(POOL, usdc);
            IPoolSwap(POOL).swap(back, 0, address(this), "");
        }

        (uint256 a0, uint256 a1) = v.claimFees();
        assertGt(a0 + a1, 0, "fees earned while locked");
        assertEq(IERC20(WETH).balanceOf(carol), a0);
        assertEq(IERC20(USDC).balanceOf(carol), a1);
        assertEq(IERC20(POOL).balanceOf(address(v)), lp, "LP still locked");

        vm.prank(alice);
        vm.expectRevert(AeroVestingVault.NothingToRelease.selector);
        v.release();

        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        v.release();
        assertEq(IERC20(POOL).balanceOf(alice), lp);
    }

    function test_fork_plainTokenIsNotLP() public {
        vm.skip(!forked);
        deal(USDC, alice, 1000e6);
        AeroLockFactory.CreateParams memory p;
        p.token = IERC20(USDC);
        p.amount = 1000e6;
        p.owner = alice;
        p.kind = AeroVestingVault.Kind.Steps;
        p.duration = 30 days;
        p.steps = 10;
        vm.startPrank(alice);
        IERC20(USDC).approve(address(factory), 1000e6);
        AeroVestingVault v = AeroVestingVault(factory.createLock(p));
        vm.stopPrank();
        assertFalse(v.isLP());
        vm.warp(block.timestamp + 90 days);
        assertEq(v.releasable(), 300e6);
    }
}
