// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AeroVestingVault} from "../../src/AeroVestingVault.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_) ERC20(name_, name_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Burns 2% of every transfer.
contract TaxToken is ERC20 {
    constructor() ERC20("Tax", "TAX") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 tax = value / 50;
            super._update(from, address(0), tax);
            value -= tax;
        }
        super._update(from, to, value);
    }
}

/// An Aerodrome-like LP token: claimFees pays out whatever fees were queued for the caller.
contract MockPool is ERC20 {
    MockERC20 public immutable token0;
    MockERC20 public immutable token1;
    mapping(address => uint256[2]) public pending;

    constructor() ERC20("vAMM-A/B", "vAMM-A/B") {
        token0 = new MockERC20("A");
        token1 = new MockERC20("B");
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function accrue(address holder, uint256 a0, uint256 a1) external {
        pending[holder][0] += a0;
        pending[holder][1] += a1;
    }

    function claimFees() external returns (uint256 a0, uint256 a1) {
        (a0, a1) = (pending[msg.sender][0], pending[msg.sender][1]);
        delete pending[msg.sender];
        token0.mint(msg.sender, a0);
        token1.mint(msg.sender, a1);
    }
}

contract MockPoolFactory {
    mapping(address => bool) public isPool;

    function setPool(address pool, bool yes) external {
        isPool[pool] = yes;
    }
}

/// Tries to hijack the brand-new vault during the deposit transfer.
contract HijackToken is ERC20 {
    address public attacker;
    bool public attempted;
    bool public hijackSucceeded;

    constructor(address attacker_) ERC20("Hijack", "HJK") {
        attacker = attacker_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (!attempted) {
            attempted = true;
            AeroVestingVault.Schedule memory s;
            s.kind = AeroVestingVault.Kind.Fixed;
            s.cliff = 1;
            try AeroVestingVault(to).initialize(IERC20(address(this)), attacker, attacker, false, 1, s) {
                hijackSucceeded = true;
            } catch {}
        }
        return super.transferFrom(from, to, value);
    }
}

/// Owns its own vault and re-enters release() while being paid out.
contract ReentrantToken is ERC20 {
    address public vault;

    constructor() ERC20("Re", "RE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setVault(address v) external {
        vault = v;
    }

    function kick() external {
        AeroVestingVault(vault).release();
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (from == vault && vault != address(0)) {
            AeroVestingVault(vault).release();
        }
    }
}

/// Treasury that refuses ETH.
contract RejectEth {}
