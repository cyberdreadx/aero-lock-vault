// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AeroLockFactory} from "../src/AeroLockFactory.sol";
import {IAerodromePoolFactory} from "../src/interfaces/IAerodrome.sol";
import {AggregatorV3Interface} from "../src/interfaces/IChainlink.sol";
import {MockERC20, MockPool, MockPoolFactory} from "../test/mocks/Mocks.sol";

/// Deploys AeroLockFactory.
///
/// Base Sepolia (84532) has no Aerodrome, so this also deploys a stand-in pool registry,
/// a test token and a test LP pool, so every flow (token lock, LP lock, fee claim) can be
/// tried in the app before mainnet.
///
/// Env: OWNER (factory admin), TREASURY (receives fees), FEE_USD (whole dollars, e.g. 150).
contract Deploy is Script {
    address constant AERODROME_FACTORY = 0x420DD381b31aEf6683db6B902084cB0FFECe40Da;
    // Aero (Oct 2026+) pool factories on Base
    address constant AERO_VOLATILE_FACTORY = 0x8E6a9FCd1d638CC760Ffba397605Fe3355dE76D2;
    address constant AERO_STABLE_FACTORY = 0x78589E876edcEbdce72ee3436ab3c9AD3a7cEF2D;
    // Chainlink on Base mainnet
    address constant ETH_USD_BASE = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    address constant SEQUENCER_BASE = 0xBCF85224fc0756B9Fa45aA7892530B47e10b6433;
    // Chainlink on Base Sepolia (no sequencer uptime feed there)
    address constant ETH_USD_BASE_SEPOLIA = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;

    function run() external {
        address owner = vm.envAddress("OWNER");
        address treasury = vm.envAddress("TREASURY");
        uint256 feeUsd = vm.envUint("FEE_USD") * 1e8;

        vm.startBroadcast();
        address aero = AERODROME_FACTORY;
        address aeroVolatile = AERO_VOLATILE_FACTORY;
        address aeroStable = AERO_STABLE_FACTORY;
        address priceFeed = ETH_USD_BASE;
        address sequencer = SEQUENCER_BASE;
        if (block.chainid == 84532) {
            MockPoolFactory registry = new MockPoolFactory();
            MockERC20 testToken = new MockERC20("AEROLOCK-TEST");
            MockPool testPool = new MockPool();
            registry.setPool(address(testPool), true);
            testToken.mint(msg.sender, 1_000_000e18);
            testPool.mint(msg.sender, 1_000_000e18);
            aero = address(registry);
            (aeroVolatile, aeroStable) = (address(0), address(0));
            priceFeed = ETH_USD_BASE_SEPOLIA;
            sequencer = address(0);
            console.log("Test pool registry:", address(registry));
            console.log("Test token:        ", address(testToken));
            console.log("Test LP pool:      ", address(testPool));
        } else {
            require(block.chainid == 8453, "Base or Base Sepolia only");
        }

        AeroLockFactory factory = new AeroLockFactory(
            owner,
            treasury,
            feeUsd,
            25e8, // $25 per extra lock in a team batch
            [IAerodromePoolFactory(aero), IAerodromePoolFactory(aeroVolatile), IAerodromePoolFactory(aeroStable)],
            AggregatorV3Interface(priceFeed),
            AggregatorV3Interface(sequencer)
        );
        vm.stopBroadcast();

        console.log("AeroLockFactory:   ", address(factory));
        console.log("Vault logic:       ", factory.implementation());
        console.log("Fee now (wei):     ", factory.fee());
    }
}
