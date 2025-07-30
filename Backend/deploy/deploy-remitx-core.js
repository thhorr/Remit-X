const { network, ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n🚀 Deploying RemitXCore with Direct Transfer CCIP integration...");

  try {
    // Get CCIP router and LINK token addresses
    const mockCCIPRouter = await get("MockCCIPRouter");
    const mockLink = await get("MockLINK");
    
    // Get mock tokens for testing/verification
    const mockUSDC = await get("MockUSDC");
    const mockUSDT = await get("MockUSDT");
    const mockDAI = await get("MockDAI");

    console.log("🚨 WARNING: Using Mock CCIP - Morph testnet does NOT have official Chainlink support!");
    console.log("🚨 IMPORTANT: Contract must be funded with tokens for direct transfers to work!");
    console.log(`Mock CCIP Router: ${mockCCIPRouter.address}`);
    console.log(`Mock LINK Token: ${mockLink.address}`);

    // Deploy RemitXCore with CCIP support
    const remitXCore = await deploy("RemitXCore", {
      from: deployer,
      args: [
        mockCCIPRouter.address, 
        mockLink.address,
        deployer  // Set deployer as owner
      ],
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
    });

    console.log(`✅ RemitXCore deployed at: ${remitXCore.address}`);

    // Test deployment to verify it's working
    if (remitXCore.newlyDeployed) {
      console.log("\n🧪 Testing direct transfer deployment...");
      
      try {
        const remitXCoreContract = await ethers.getContractAt("RemitXCore", remitXCore.address);
        
        // Verify CCIP router and LINK token are set correctly
        const routerAddress = await remitXCoreContract.ccipRouter();
        const linkAddress = await remitXCoreContract.linkToken();
        
        console.log(`✓ CCIP Router set to: ${routerAddress}`);
        console.log(`✓ LINK Token set to: ${linkAddress}`);
        
        // Test getFee function for direct transfers
        const testRecipient = "0x1234567890123456789012345678901234567890";
        const testAmount = ethers.parseUnits("100", 6);
        
        // This should return 0 since no chains are configured yet
        const fee = await remitXCoreContract.getFee(
          BigInt("16015286601757825753"), // Sepolia
          testRecipient, 
          testAmount
        );
        console.log(`✓ CCIP Fee function works! Fee (unconfigured): ${ethers.formatEther(fee)} ETH`);
        
        // Test getting contract balance (should be 0)
        const usdcBalance = await remitXCoreContract.getContractTokenBalance(mockUSDC.address);
        console.log(`✓ Contract USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
        
        console.log("✅ Contract deployment verified successfully!");
      } catch (error) {
        console.log("⚠️ Contract verification failed:", error.message);
        console.log("   This may be expected if you haven't configured tokens yet");
      }
    }

    // Deployment summary
    console.log("\n📋 Direct Transfer Deployment Summary:");
    console.log(`├─ RemitXCore: ${remitXCore.address}`);
    console.log(`├─ MockCCIPRouter: ${mockCCIPRouter.address}`);
    console.log(`├─ MockLINK: ${mockLink.address}`);
    console.log(`├─ MockUSDC: ${mockUSDC.address}`);
    console.log(`├─ MockUSDT: ${mockUSDT.address}`);
    console.log(`└─ MockDAI: ${mockDAI.address}`);

    console.log("\n📝 Next Steps for Direct Transfer Mode:");
    console.log("1. Run setup-contracts.js to configure tokens, price feeds and chains");
    console.log("2. Fund contract with tokens for direct transfers (CRITICAL)");
    console.log("3. Verify all chain selectors are correctly configured");
    console.log("4. Update frontend contracts.js with new addresses");
    console.log("5. Ensure RemittanceHistory.jsx is updated for direct transfers");

    console.log("\n🔄 Direct Transfer Requirements:");
    console.log("- Contract must have sufficient token balances for all supported tokens");
    console.log("- CCIP Router must have all destination chains configured");
    console.log("- Frontend must use updated abi with direct transfer functions");
    console.log("- Users must provide sufficient ETH for CCIP fees on cross-chain transfers");

    console.log("\n🔧 Frontend Contract Update:");
    console.log(`REMITX_CORE: "${remitXCore.address}",`);
    console.log(`MOCK_CCIP_ROUTER: "${mockCCIPRouter.address}",`);
    console.log(`MOCK_USDC: "${mockUSDC.address}",`);
    console.log(`MOCK_USDT: "${mockUSDT.address}",`);
    console.log(`MOCK_DAI: "${mockDAI.address}",`);

  } catch (error) {
    console.error("❌ Direct Transfer Deployment failed:", error.message);
    throw error;
  }
};

module.exports.tags = ["RemitXCore"];
module.exports.dependencies = ["MockCCIP", "MockTokens", "MockPriceFeeds"];
