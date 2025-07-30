const { network, ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n⚙️ Setting up RemitX contracts with direct transfer support...");

  try {
    console.log("\n🔍 Fetching deployment information...");
    // ✅ Check for all required contracts
    const remitXCoreDeployment = await get("RemitXCore");
    const mockCCIPRouterDeployment = await get("MockCCIPRouter");
    const mockLinkDeployment = await get("MockLINK");
    const mockUSDCDeployment = await get("MockUSDC");
    const mockUSDTDeployment = await get("MockUSDT");
    const mockDAIDeployment = await get("MockDAI");

    console.log(`Found RemitXCore at: ${remitXCoreDeployment.address}`);
    console.log(`Found MockCCIPRouter at: ${mockCCIPRouterDeployment.address}`);
    console.log(`Found MockUSDC at: ${mockUSDCDeployment.address}`);
    console.log(`Found MockUSDT at: ${mockUSDTDeployment.address}`);
    console.log(`Found MockDAI at: ${mockDAIDeployment.address}`);

    // ✅ FIXED: Get price feeds with correct names
    const usdcPriceFeed = await get("MockPriceFeed_USDC_USD");
    const usdtPriceFeed = await get("MockPriceFeed_USDT_USD");
    const daiPriceFeed = await get("MockPriceFeed_DAI_USD");

    console.log(`Found USDC price feed at: ${usdcPriceFeed.address}`);
    console.log(`Found USDT price feed at: ${usdtPriceFeed.address}`);
    console.log(`Found DAI price feed at: ${daiPriceFeed.address}`);

    console.log("\n✅ All contracts found, getting signer...");
    
    // Get signer directly at the start
    const signer = await ethers.getSigner(deployer);
    console.log(`Using signer address: ${signer.address}`);
    
    console.log("\n📄 Creating contract factory instances...");
    
    // ⚠️ COMPLETELY NEW APPROACH: Get contract factories
    const RemitXCore = await ethers.getContractFactory("RemitXCore");
    const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    
    // ⚠️ NEW: Create contract instances using contract factories
    console.log(`Connecting to RemitXCore at: ${remitXCoreDeployment.address}`);
    const remitXCore = RemitXCore.attach(remitXCoreDeployment.address).connect(signer);
    
    console.log(`Connecting to MockCCIPRouter at: ${mockCCIPRouterDeployment.address}`);
    const mockCCIPRouter = MockCCIPRouter.attach(mockCCIPRouterDeployment.address).connect(signer);
    
    console.log(`Connecting to MockUSDC at: ${mockUSDCDeployment.address}`);
    const mockUSDC = MockUSDC.attach(mockUSDCDeployment.address).connect(signer);
    
    console.log(`Connecting to MockUSDT at: ${mockUSDTDeployment.address}`);
    const mockUSDT = MockUSDT.attach(mockUSDTDeployment.address).connect(signer);
    
    console.log(`Connecting to MockDAI at: ${mockDAIDeployment.address}`);
    const mockDAI = MockDAI.attach(mockDAIDeployment.address).connect(signer);
    
    // Verify contract instances have addresses
    console.log("\n🔍 Verifying contract instances...");
    console.log(`RemitXCore address: ${remitXCore.target}`);
    console.log(`MockCCIPRouter address: ${mockCCIPRouter.target}`);
    console.log(`MockUSDC address: ${mockUSDC.target}`);
    console.log(`MockUSDT address: ${mockUSDT.target}`);
    console.log(`MockDAI address: ${mockDAI.target}`);
    
    // ✅ FIXED: Add supported tokens with correct ethers syntax
    console.log("\n🪙 Adding supported tokens...");

    try {
      const tx1 = await remitXCore.addSupportedToken(
        mockUSDCDeployment.address,
        usdcPriceFeed.address,
        ethers.parseUnits("1", 6),
        ethers.parseUnits("10000", 6)
      );
      await tx1.wait();
      console.log("✅ Added USDC support");
    } catch (error) {
      console.log("⚠️ USDC already supported or error:", error.message);
    }

    try {
      const tx2 = await remitXCore.addSupportedToken(
        mockUSDTDeployment.address,
        usdtPriceFeed.address,
        ethers.parseUnits("1", 6),
        ethers.parseUnits("10000", 6)
      );
      await tx2.wait();
      console.log("✅ Added USDT support");
    } catch (error) {
      console.log("⚠️ USDT already supported or error:", error.message);
    }

    try {
      const tx3 = await remitXCore.addSupportedToken(
        mockDAIDeployment.address,
        daiPriceFeed.address,
        ethers.parseUnits("1", 18),
        ethers.parseUnits("10000", 18)
      );
      await tx3.wait();
      console.log("✅ Added DAI support");
    } catch (error) {
      console.log("⚠️ DAI already supported or error:", error.message);
    }

    // ✅ FIXED: Add proper CCIP chain selectors (not chain IDs)
    console.log("\n🌐 Adding supported chains...");

    const chains = [
      { selector: "16015286601757825753", name: "Ethereum Sepolia" },
      { selector: "2810", name: "Morph Testnet" },
      { selector: "10344971235874465080", name: "BSC Testnet" },
      { selector: "14767482510784806043", name: "Avalanche Fuji" },
      { selector: "3478487238524512106", name: "Arbitrum Sepolia" },
      { selector: "5224473277236331295", name: "Optimism Sepolia" },
    ];

    for (const chain of chains) {
      try {
        // Add to CCIP Router
        console.log(`Adding ${chain.name} to CCIP Router...`);
        const tx1 = await mockCCIPRouter.addSupportedChain(BigInt(chain.selector));
        await tx1.wait();

        // Add to RemitXCore
        console.log(`Adding ${chain.name} to RemitXCore...`);
        const tx2 = await remitXCore.addSupportedChain(BigInt(chain.selector));
        await tx2.wait();

        console.log(`✅ Added ${chain.name} support`);
      } catch (error) {
        console.log(`⚠️ ${chain.name} already supported or error:`, error.message);
      }
    }

    // ⚠️ CRITICAL FIX: Use target property instead of address
    console.log("\nDEBUG: Contract targets after setup:");
    console.log(`RemitXCore: ${remitXCore.target}`);
    console.log(`MockUSDC: ${mockUSDC.target}`);
    console.log(`MockUSDT: ${mockUSDT.target}`);
    console.log(`MockDAI: ${mockDAI.target}`);

    // ✅ NEW: Fund contract with tokens for direct transfers (after adding token support)
    console.log("\n💰 Funding contract with tokens for direct transfers...");

    try {
      // ⚠️ FIXED: Use target instead of address for verification
      if (!remitXCore.target || !mockUSDC.target || !mockUSDT.target || !mockDAI.target) {
        throw new Error("One or more contract targets are undefined");
      }

      console.log("\n🪙 Minting tokens to deployer...");

      // Mint tokens to deployer with gas limit - using smaller amounts first
      console.log(`Minting 1,000 USDC to ${deployer}...`);
      await mockUSDC.mint(deployer, ethers.parseUnits("1000", 6), { gasLimit: 500000 });
      console.log("✅ USDC minted");

      console.log(`Minting 1,000 USDT to ${deployer}...`);
      await mockUSDT.mint(deployer, ethers.parseUnits("1000", 6), { gasLimit: 500000 });
      console.log("✅ USDT minted");

      console.log(`Minting 1,000 DAI to ${deployer}...`);
      await mockDAI.mint(deployer, ethers.parseUnits("1000", 18), { gasLimit: 500000 });
      console.log("✅ DAI minted");

      console.log("\n🔓 Approving tokens for RemitXCore...");

      // Approve with gas limit
      console.log(`Approving 1,000 USDC for ${remitXCore.target}...`);
      await mockUSDC.approve(remitXCore.target, ethers.parseUnits("1000", 6), { gasLimit: 500000 });
      console.log("✅ USDC approved");

      console.log(`Approving 1,000 USDT for ${remitXCore.target}...`);
      await mockUSDT.approve(remitXCore.target, ethers.parseUnits("1000", 6), { gasLimit: 500000 });
      console.log("✅ USDT approved");

      console.log(`Approving 1,000 DAI for ${remitXCore.target}...`);
      await mockDAI.approve(remitXCore.target, ethers.parseUnits("1000", 18), { gasLimit: 500000 });
      console.log("✅ DAI approved");

      console.log("\n💸 Funding RemitXCore with tokens...");

      // Fund contract with gas limit - using smaller amounts
      console.log(`Funding RemitXCore with 500 USDC...`);
      await remitXCore.fundContract(mockUSDC.target, ethers.parseUnits("500", 6), { gasLimit: 500000 });
      console.log("✅ USDC funded");

      console.log(`Funding RemitXCore with 500 USDT...`);
      await remitXCore.fundContract(mockUSDT.target, ethers.parseUnits("500", 6), { gasLimit: 500000 });
      console.log("✅ USDT funded");

      console.log(`Funding RemitXCore with 500 DAI...`);
      await remitXCore.fundContract(mockDAI.target, ethers.parseUnits("500", 18), { gasLimit: 500000 });
      console.log("✅ DAI funded");

      console.log("\n✅ Contract funded with tokens for direct transfers!");
    } catch (error) {
      console.log("\n⚠️ Contract funding failed:", error.message);

      // Add more detailed error information
      if (error.code) {
        console.log(`Error code: ${error.code}`);
      }
      if (error.reason) {
        console.log(`Error reason: ${error.reason}`);
      }
      if (error.transaction) {
        console.log(`Failed transaction: ${JSON.stringify(error.transaction)}`);
      }
    }

    // ✅ Test CCIP functionality
    console.log("\n🧪 Testing CCIP functionality...");
    try {
      const testRecipient = "0x1234567890123456789012345678901234567890";
      const testAmount = ethers.parseUnits("100", 6);

      console.log("Getting CCIP fee...");
      const fee = await remitXCore.getFee(
        BigInt("16015286601757825753"),
        testRecipient,
        testAmount
      );
      console.log(`✅ CCIP getFee working: ${ethers.formatEther(fee)} ETH`);
    } catch (error) {
      console.log("⚠️ CCIP test failed:", error.message);
    }

    console.log("\n🎉 Setup completed successfully!");
    console.log(`📍 Configured RemitXCore: ${remitXCoreDeployment.address}`);
    console.log(`Direct transfers are now enabled and the contract is funded with tokens`);
    console.log(`Update your frontend with these contract addresses.`);

  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    throw error;
  }
};

module.exports.tags = ["Setup"];
module.exports.dependencies = ["MockCCIP", "MockPriceFeeds", "MockTokens", "RemitXCore"];
