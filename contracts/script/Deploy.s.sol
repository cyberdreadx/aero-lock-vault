// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AeroLockFactory} from "../src/AeroLockFactory.sol";
import {IAerodromePoolFactory} from "../src/interfaces/IAerodrome.sol";
import {MockERC20, MockPool, MockPoolFactory} from "../test/mocks/Mocks.sol";

/// Deploys AeroLockFactory.
///
/// Base Sepolia (84532) has no Aerodrome, so this also deploys a stand-in pool registry,
/// a test token and a test LP pool, so every flow (token lock, LP lock, fee claim) can be
/// tried in the app before mainnet.
///
/// Env: OWNER (factory admin), TREASURY (receives fees), FEE_WEI (creation fee).
contract Deploy is Script {
    address constant AERODROME_FACTORY = 0x420DD381b31aEf6683db6B902084cB0FFECe40Da;

    function run() external {
        address owner = vm.envAddress("OWNER");
        address treasury = vm.envAddress("TREASURY");
        uint256 fee = vm.envUint("FEE_WEI");

        vm.startBroadcast();
        address aero = AERODROME_FACTORY;
        if (block.chainid == 84532) {
            MockPoolFactory registry = new MockPoolFactory();
            MockERC20 testToken = new MockERC20("AEROLOCK-TEST");
            MockPool testPool = new MockPool();
            registry.setPool(address(testPool), true);
            testToken.mint(msg.sender, 1_000_000e18);
            testPool.mint(msg.sender, 1_000_000e18);
            aero = address(registry);
            console.log("Test pool registry:", address(registry));
            console.log("Test token:        ", address(testToken));
            console.log("Test LP pool:      ", address(testPool));
        } else {
            require(block.chainid == 8453, "Base or Base Sepolia only");
        }

        AeroLockFactory factory = new AeroLockFactory(owner, treasury, fee, IAerodromePoolFactory(aero));
        vm.stopBroadcast();

        console.log("AeroLockFactory:   ", address(factory));
        console.log("Vault logic:       ", factory.implementation());
    }
}
