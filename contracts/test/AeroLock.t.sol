// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AeroLockFactory} from "../src/AeroLockFactory.sol";
import {AeroVestingVault} from "../src/AeroVestingVault.sol";
import {IAerodromePoolFactory} from "../src/interfaces/IAerodrome.sol";
import {
    MockERC20,
    TaxToken,
    MockPool,
    MockPoolFactory,
    HijackToken,
    ReentrantToken,
    RejectEth
} from "./mocks/Mocks.sol";

contract AeroLockTest is Test {
    AeroLockFactory factory;
    MockPoolFactory poolFactory;
    MockERC20 token;
    MockPool pool;

    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant FEE = 0.04 ether;
    uint256 constant AMOUNT = 1_000_000e18;
    uint64 constant T0 = 1_750_000_000;

    function setUp() public {
        vm.warp(T0);
        poolFactory = new MockPoolFactory();
        factory = new AeroLockFactory(admin, treasury, FEE, IAerodromePoolFactory(address(poolFactory)));
        token = new MockERC20("TKN");
        pool = new MockPool();
        poolFactory.setPool(address(pool), true);

        token.mint(alice, 100 * AMOUNT);
        pool.mint(alice, 100 * AMOUNT);
        vm.deal(alice, 10 ether);
        vm.startPrank(alice);
        token.approve(address(factory), type(uint256).max);
        pool.approve(address(factory), type(uint256).max);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- helpers

    function _params(IERC20 t, AeroVestingVault.Kind kind)
        internal
        view
        returns (AeroLockFactory.CreateParams memory p)
    {
        p.token = t;
        p.amount = AMOUNT;
        p.owner = alice;
        p.kind = kind;
        p.unlockTime = T0 + 365 days;
        p.cliffDuration = 90 days;
        p.duration = 30 days;
        p.steps = 12;
    }

    function _fixed(uint64 unlock) internal returns (AeroVestingVault) {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Fixed);
        p.unlockTime = unlock;
        return _create(p);
    }

    function _create(AeroLockFactory.CreateParams memory p) internal returns (AeroVestingVault) {
        vm.prank(alice);
        return AeroVestingVault(factory.createLock{value: FEE}(p));
    }

    // ------------------------------------------------------------ creation

    function test_create_recordsEverything() public {
        uint256 treasuryBefore = treasury.balance;
        AeroVestingVault v = _fixed(T0 + 30 days);

        assertEq(token.balanceOf(address(v)), AMOUNT);
        assertEq(v.total(), AMOUNT);
        assertEq(v.owner(), alice);
        assertEq(v.feeReceiver(), alice, "fee receiver defaults to owner");
        assertEq(address(v.token()), address(token));
        assertEq(v.factory(), address(factory));
        assertFalse(v.isLP());
        assertEq(treasury.balance - treasuryBefore, FEE);
        assertEq(address(factory).balance, 0, "factory keeps no ETH");
        assertEq(factory.vaultCount(), 1);
        assertEq(factory.vaultAt(0), address(v));
        assertEq(factory.vaultsOf(alice)[0], address(v));
    }

    function test_create_detectsLP() public {
        AeroVestingVault v = _create(_params(pool, AeroVestingVault.Kind.Fixed));
        assertTrue(v.isLP());
    }

    function test_create_customFeeReceiver() public {
        AeroLockFactory.CreateParams memory p = _params(pool, AeroVestingVault.Kind.Fixed);
        p.feeReceiver = carol;
        assertEq(_create(p).feeReceiver(), carol);
    }

    function test_create_forSomeoneElse() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.CliffLinear);
        p.owner = bob;
        AeroVestingVault v = _create(p);
        assertEq(v.owner(), bob);
        assertEq(factory.vaultsOf(bob)[0], address(v));
    }

    function test_create_emitsEvent() public {
        vm.expectEmit(false, true, true, true);
        emit AeroLockFactory.LockCreated(
            address(0),
            address(token),
            alice,
            alice,
            AMOUNT,
            false,
            AeroVestingVault.Kind.CliffLinear,
            T0,
            T0 + 90 days,
            30 days,
            0
        );
        _create(_params(token, AeroVestingVault.Kind.CliffLinear));
    }

    function test_create_wrongFeeReverts() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Fixed);
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(AeroLockFactory.WrongFee.selector, FEE, 0));
        factory.createLock(p);
        vm.expectRevert(abi.encodeWithSelector(AeroLockFactory.WrongFee.selector, FEE, FEE + 1));
        factory.createLock{value: FEE + 1}(p);
        vm.stopPrank();
    }

    function test_create_feeExempt() public {
        vm.prank(admin);
        factory.setFeeExempt(alice, true);
        vm.startPrank(alice);
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Fixed);
        vm.expectRevert(abi.encodeWithSelector(AeroLockFactory.WrongFee.selector, 0, FEE));
        factory.createLock{value: FEE}(p);
        factory.createLock(p);
        vm.stopPrank();
    }

    function test_create_invalidInputsRevert() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Fixed);
        vm.startPrank(alice);

        p.amount = 0;
        vm.expectRevert(AeroLockFactory.ZeroAmount.selector);
        factory.createLock{value: FEE}(p);
        p.amount = AMOUNT;

        p.owner = address(0);
        vm.expectRevert(AeroLockFactory.ZeroAddress.selector);
        factory.createLock{value: FEE}(p);
        p.owner = alice;

        // Fixed: unlock must be in the future and within 100 years
        p.unlockTime = T0;
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);
        p.unlockTime = T0 + factory.MAX_SPAN() + 1;
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);

        // CliffLinear: needs a duration
        p.kind = AeroVestingVault.Kind.CliffLinear;
        p.duration = 0;
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);

        // Steps: needs steps and interval, bounded
        p.kind = AeroVestingVault.Kind.Steps;
        p.duration = 30 days;
        p.steps = 0;
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);
        p.steps = factory.MAX_STEPS() + 1;
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);
        p.steps = 1000;
        p.duration = 365 days; // 1000 years
        vm.expectRevert(AeroLockFactory.InvalidSchedule.selector);
        factory.createLock{value: FEE}(p);
        vm.stopPrank();
    }

    function test_create_invalidKindReverts() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Fixed);
        bytes memory data = abi.encodeCall(AeroLockFactory.createLock, (p));
        // CreateParams is static, so `kind` is the 5th word after the selector
        assembly {
            mstore(add(data, add(36, mul(4, 32))), 7)
        }
        vm.prank(alice);
        (bool ok,) = address(factory).call{value: FEE}(data);
        assertFalse(ok);
    }

    function test_create_taxTokenLocksWhatArrived() public {
        TaxToken tax = new TaxToken();
        tax.mint(alice, AMOUNT);
        vm.prank(alice);
        tax.approve(address(factory), AMOUNT);
        AeroVestingVault v = _create(_params(IERC20(address(tax)), AeroVestingVault.Kind.Fixed));
        assertEq(v.total(), AMOUNT - AMOUNT / 50);
        assertEq(v.total(), tax.balanceOf(address(v)));

        vm.warp(T0 + 365 days);
        vm.prank(alice);
        v.release();
        assertEq(tax.balanceOf(address(v)), 0, "fully drained despite the tax");
    }

    function test_create_treasuryRejectingEthReverts() public {
        address rejecting = address(new RejectEth());
        vm.prank(admin);
        factory.setTreasury(rejecting);
        vm.prank(alice);
        vm.expectRevert(AeroLockFactory.FeeTransferFailed.selector);
        factory.createLock{value: FEE}(_params(token, AeroVestingVault.Kind.Fixed));
    }

    // ------------------------------------------------------------ schedules

    function test_fixed_nothingBeforeUnlock() public {
        AeroVestingVault v = _fixed(T0 + 30 days);
        vm.warp(T0 + 30 days - 1);
        assertEq(v.releasable(), 0);
        assertEq(v.stillLocked(), AMOUNT);
        vm.prank(alice);
        vm.expectRevert(AeroVestingVault.NothingToRelease.selector);
        v.release();
    }

    function test_fixed_everythingAtUnlock() public {
        AeroVestingVault v = _fixed(T0 + 30 days);
        assertEq(v.fullyUnlockedAt(), T0 + 30 days);
        vm.warp(T0 + 30 days);
        assertEq(v.releasable(), AMOUNT);
        vm.prank(alice);
        v.release();
        assertEq(token.balanceOf(address(v)), 0);
        assertEq(v.released(), AMOUNT);
        assertEq(v.releasable(), 0);
    }

    function test_fixed_extend() public {
        AeroVestingVault v = _fixed(T0 + 30 days);
        vm.startPrank(alice);
        vm.expectRevert(AeroVestingVault.UnlockNotLater.selector);
        v.extendUnlock(T0 + 30 days);
        vm.expectRevert(AeroVestingVault.UnlockNotLater.selector);
        v.extendUnlock(T0 + 10 days);
        v.extendUnlock(T0 + 60 days);
        vm.stopPrank();

        assertEq(v.fullyUnlockedAt(), T0 + 60 days);
        vm.warp(T0 + 45 days);
        assertEq(v.releasable(), 0, "old date no longer unlocks");
        vm.prank(bob);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.extendUnlock(T0 + 90 days);
    }

    function test_fixed_extendAfterReleaseKeepsViewsSane() public {
        AeroVestingVault v = _fixed(T0 + 30 days);
        vm.warp(T0 + 30 days);
        vm.startPrank(alice);
        v.release();
        v.extendUnlock(T0 + 60 days);
        vm.stopPrank();
        assertEq(v.releasable(), 0);
    }

    function test_extendOnlyForFixed() public {
        AeroVestingVault v = _create(_params(token, AeroVestingVault.Kind.CliffLinear));
        vm.prank(alice);
        vm.expectRevert(AeroVestingVault.NotFixedSchedule.selector);
        v.extendUnlock(T0 + 1000 days);
    }

    function test_cliffLinear() public {
        // 90-day cliff, then linear over 30 days
        AeroVestingVault v = _create(_params(token, AeroVestingVault.Kind.CliffLinear));
        assertEq(v.fullyUnlockedAt(), T0 + 120 days);

        vm.warp(T0 + 90 days - 1);
        assertEq(v.releasable(), 0);
        vm.warp(T0 + 90 days);
        assertEq(v.releasable(), 0, "cliff itself unlocks nothing yet");
        vm.warp(T0 + 105 days);
        assertEq(v.releasable(), AMOUNT / 2);

        vm.prank(alice);
        v.release();
        assertEq(token.balanceOf(alice), 99 * AMOUNT + AMOUNT / 2);

        vm.warp(T0 + 120 days);
        assertEq(v.releasable(), AMOUNT / 2);
        vm.warp(T0 + 10_000 days);
        vm.prank(alice);
        v.release();
        assertEq(token.balanceOf(address(v)), 0);
    }

    function test_cliffLinear_zeroCliffIsPureLinear() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.CliffLinear);
        p.cliffDuration = 0;
        p.duration = 100 days;
        AeroVestingVault v = _create(p);
        vm.warp(T0 + 25 days);
        assertEq(v.releasable(), AMOUNT / 4);
    }

    function test_steps() public {
        // 12 monthly steps
        AeroVestingVault v = _create(_params(token, AeroVestingVault.Kind.Steps));
        assertEq(v.fullyUnlockedAt(), T0 + 360 days);

        vm.warp(T0 + 30 days - 1);
        assertEq(v.releasable(), 0);
        vm.warp(T0 + 30 days);
        assertEq(v.releasable(), AMOUNT / 12);
        vm.warp(T0 + 89 days);
        assertEq(v.releasable(), (AMOUNT * 2) / 12);
        vm.warp(T0 + 360 days);
        assertEq(v.releasable(), AMOUNT, "last step takes the rounding dust");
    }

    function test_steps_singleStepActsLikeTimelock() public {
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind.Steps);
        p.steps = 1;
        p.duration = 7 days;
        AeroVestingVault v = _create(p);
        vm.warp(T0 + 7 days - 1);
        assertEq(v.releasable(), 0);
        vm.warp(T0 + 7 days);
        assertEq(v.releasable(), AMOUNT);
    }

    function test_hugeSupplyTokenDoesNotOverflow() public {
        MockERC20 big = new MockERC20("BIG");
        uint256 huge = type(uint256).max / 2;
        big.mint(alice, huge);
        vm.prank(alice);
        big.approve(address(factory), huge);
        AeroLockFactory.CreateParams memory p = _params(IERC20(address(big)), AeroVestingVault.Kind.CliffLinear);
        p.amount = huge;
        AeroVestingVault v = _create(p);
        vm.warp(T0 + 105 days);
        assertEq(v.releasable(), huge / 2);
        vm.prank(alice);
        v.release();
    }

    // ------------------------------------------------------------ access control

    function test_onlyOwnerCanRelease() public {
        AeroVestingVault v = _fixed(T0 + 1 days);
        vm.warp(T0 + 1 days);
        vm.prank(bob);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.release();
        vm.prank(admin);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.release();
    }

    function test_cannotReinitialize() public {
        AeroVestingVault v = _fixed(T0 + 1 days);
        AeroVestingVault.Schedule memory s;
        vm.prank(address(factory));
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        v.initialize(token, bob, bob, false, 1, s);
    }

    function test_implementationCannotBeInitialized() public {
        AeroVestingVault impl = AeroVestingVault(factory.implementation());
        AeroVestingVault.Schedule memory s;
        vm.prank(address(factory));
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        impl.initialize(token, bob, bob, false, 1, s);
    }

    function test_hijackDuringDepositFails() public {
        HijackToken bad = new HijackToken(bob);
        bad.mint(alice, AMOUNT);
        vm.prank(alice);
        bad.approve(address(factory), AMOUNT);
        AeroVestingVault v = _create(_params(IERC20(address(bad)), AeroVestingVault.Kind.Fixed));
        assertTrue(bad.attempted());
        assertFalse(bad.hijackSucceeded());
        assertEq(v.owner(), alice);
    }

    function test_reentrantReleaseBlocked() public {
        ReentrantToken re = new ReentrantToken();
        re.mint(alice, AMOUNT);
        vm.prank(alice);
        re.approve(address(factory), AMOUNT);
        AeroLockFactory.CreateParams memory p = _params(IERC20(address(re)), AeroVestingVault.Kind.CliffLinear);
        p.owner = address(re);
        AeroVestingVault v = _create(p);
        re.setVault(address(v));

        vm.warp(T0 + 105 days);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        re.kick();
    }

    function test_twoStepOwnership() public {
        AeroVestingVault v = _fixed(T0 + 1 days);
        vm.prank(bob);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.transferOwnership(bob);

        vm.prank(alice);
        v.transferOwnership(bob);
        assertEq(v.owner(), alice, "not moved until accepted");
        vm.prank(carol);
        vm.expectRevert(AeroVestingVault.NotPendingOwner.selector);
        v.acceptOwnership();

        vm.prank(bob);
        v.acceptOwnership();
        assertEq(v.owner(), bob);
        assertEq(v.pendingOwner(), address(0));

        vm.warp(T0 + 1 days);
        vm.prank(alice);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.release();
        vm.prank(bob);
        v.release();
        assertEq(token.balanceOf(bob), AMOUNT);
    }

    function test_cannotTransferOwnershipToZero() public {
        AeroVestingVault v = _fixed(T0 + 1 days);
        vm.prank(alice);
        vm.expectRevert(AeroVestingVault.ZeroAddress.selector);
        v.transferOwnership(address(0));
    }

    function test_recoverToken() public {
        AeroVestingVault v = _fixed(T0 + 1000 days);
        MockERC20 stray = new MockERC20("STRAY");
        stray.mint(address(v), 5e18);

        vm.startPrank(alice);
        vm.expectRevert(AeroVestingVault.CannotRecoverLockedToken.selector);
        v.recoverToken(token, 1);
        v.recoverToken(stray, 5e18);
        vm.stopPrank();
        assertEq(stray.balanceOf(alice), 5e18);

        vm.prank(bob);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.recoverToken(stray, 0);
    }

    function test_releaseNeverTakesExtraDeposits() public {
        // tokens sent straight to the vault after creation stay under the schedule's total
        AeroVestingVault v = _fixed(T0 + 1 days);
        token.mint(address(v), 5e18);
        vm.warp(T0 + 1 days);
        vm.prank(alice);
        v.release();
        assertEq(v.released(), AMOUNT);
        assertEq(token.balanceOf(address(v)), 5e18);
    }

    // ------------------------------------------------------------ LP fees

    function test_claimFees_goToFeeReceiver() public {
        AeroLockFactory.CreateParams memory p = _params(pool, AeroVestingVault.Kind.Fixed);
        p.feeReceiver = carol;
        AeroVestingVault v = _create(p);
        pool.accrue(address(v), 7e18, 3e18);

        vm.prank(bob); // anyone can trigger it
        (uint256 a0, uint256 a1) = v.claimFees();
        assertEq(a0, 7e18);
        assertEq(a1, 3e18);
        assertEq(pool.token0().balanceOf(carol), 7e18);
        assertEq(pool.token1().balanceOf(carol), 3e18);
        assertEq(pool.balanceOf(address(v)), AMOUNT, "LP never moves");
        assertEq(pool.balanceOf(bob), 0);
    }

    function test_claimFees_followsFeeReceiverChange() public {
        AeroVestingVault v = _create(_params(pool, AeroVestingVault.Kind.Fixed));
        vm.prank(bob);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.setFeeReceiver(bob);
        vm.prank(alice);
        v.setFeeReceiver(carol);
        pool.accrue(address(v), 1e18, 0);
        v.claimFees();
        assertEq(pool.token0().balanceOf(carol), 1e18);
    }

    function test_claimFees_onlyForLP() public {
        AeroVestingVault v = _fixed(T0 + 1 days);
        vm.expectRevert(AeroVestingVault.NotLP.selector);
        v.claimFees();
    }

    // ------------------------------------------------------------ factory admin

    function test_admin() public {
        vm.startPrank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        factory.setFee(0);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        factory.setTreasury(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        factory.setFeeExempt(bob, true);
        vm.stopPrank();

        vm.startPrank(admin);
        factory.setFee(1 ether);
        assertEq(factory.fee(), 1 ether);
        vm.expectRevert(AeroLockFactory.ZeroAddress.selector);
        factory.setTreasury(address(0));
        factory.setTreasury(carol);
        assertEq(factory.treasury(), carol);
        factory.transferOwnership(bob);
        vm.stopPrank();
        assertEq(factory.owner(), admin, "two-step");
        vm.prank(bob);
        factory.acceptOwnership();
        assertEq(factory.owner(), bob);
    }

    function test_factoryAdminHasNoPowerOverVaults() public {
        AeroVestingVault v = _fixed(T0 + 1000 days);
        vm.startPrank(admin);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.release();
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.transferOwnership(admin);
        vm.expectRevert(AeroVestingVault.NotOwner.selector);
        v.recoverToken(token, 1);
        vm.stopPrank();
    }

    function test_nonPoolFactoryResponseIsNotLP() public {
        // a token the Aerodrome factory doesn't know is locked as a plain token
        poolFactory.setPool(address(pool), false);
        assertFalse(_create(_params(pool, AeroVestingVault.Kind.Fixed)).isLP());
    }

    // ------------------------------------------------------------ fuzz

    function _fuzzVault(uint8 kindSeed, uint256 amount, uint64 a, uint64 b, uint32 steps)
        internal
        returns (AeroVestingVault v)
    {
        amount = bound(amount, 1, 100 * AMOUNT);
        AeroLockFactory.CreateParams memory p = _params(token, AeroVestingVault.Kind(kindSeed % 3));
        p.amount = amount;
        p.unlockTime = uint64(bound(a, T0 + 1, T0 + 50 * 365 days));
        p.cliffDuration = uint64(bound(a, 0, 20 * 365 days));
        p.duration = uint64(bound(b, 1, 20 * 365 days));
        p.steps = uint32(bound(steps, 1, 1000));
        if (p.kind == AeroVestingVault.Kind.Steps) p.duration = uint64(bound(b, 1, 30 days));
        v = _create(p);
    }

    function testFuzz_vestingIsMonotonicAndBounded(
        uint8 kind,
        uint256 amount,
        uint64 a,
        uint64 b,
        uint32 steps,
        uint64 t1,
        uint64 t2
    ) public {
        AeroVestingVault v = _fuzzVault(kind, amount, a, b, steps);
        t1 = uint64(bound(t1, 0, T0 + 200 * 365 days));
        t2 = uint64(bound(t2, t1, T0 + 200 * 365 days));
        uint256 v1 = v.vestedAmount(t1);
        uint256 v2 = v.vestedAmount(t2);
        assertLe(v1, v2, "never decreases");
        assertLe(v2, v.total(), "never exceeds total");
        assertEq(v.vestedAmount(v.fullyUnlockedAt()), v.total(), "all unlocked at the end");
        assertLt(v.vestedAmount(v.fullyUnlockedAt() - 1), v.total(), "not a second earlier");
    }

    function testFuzz_releasesSumToTotal(
        uint8 kind,
        uint256 amount,
        uint64 a,
        uint64 b,
        uint32 steps,
        uint64[6] memory jumps
    ) public {
        AeroVestingVault v = _fuzzVault(kind, amount, a, b, steps);
        uint256 before = token.balanceOf(alice);
        uint64 t = T0;
        for (uint256 i; i < jumps.length; i++) {
            t += uint64(bound(jumps[i], 0, 5 * 365 days));
            vm.warp(t);
            assertLe(v.released() + v.releasable(), v.vestedAmount(t));
            if (v.releasable() > 0) {
                vm.prank(alice);
                v.release();
            }
            assertEq(v.released(), v.vestedAmount(t), "releases track the schedule exactly");
        }
        vm.warp(v.fullyUnlockedAt());
        if (v.releasable() > 0) {
            vm.prank(alice);
            v.release();
        }
        assertEq(token.balanceOf(alice) - before, v.total());
        assertEq(token.balanceOf(address(v)), 0);
    }

    function testFuzz_nothingBeforeStartOfUnlock(uint8 kind, uint256 amount, uint64 a, uint64 b, uint32 steps) public {
        AeroVestingVault v = _fuzzVault(kind, amount, a, b, steps);
        // right after creation nothing is releasable for any schedule
        assertEq(v.releasable(), 0);
        assertEq(v.stillLocked(), v.total());
    }
}
