const { network, ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🌐 Deploying Mock CCIP contracts...");

  // Deploy MockCCIPRouter
  const mockCCIPRouterArgs = [];
  const mockCCIPRouter = await deploy("MockCCIPRouter", {
    from: deployer,
    args: mockCCIPRouterArgs,
    log: true,
    waitConfirmations: network.live ? 5 : 1,
  });

  // Deploy MockLINK token
  const mockLinkArgs = [];
  const mockLINK = await deploy("MockLINK", {
    from: deployer,
    args: mockLinkArgs,
    log: true,
    waitConfirmations: network.live ? 5 : 1,
  });

  log(`✅ MockCCIPRouter deployed to: ${mockCCIPRouter.address}`);
  log(`✅ MockLINK deployed to: ${mockLINK.address}`);

  // Verify contracts on Etherscan/block explorer if on live network
  if (network.live && hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    log("📝 Verifying MockCCIPRouter...");
    try {
      await hre.run("verify:verify", {
        address: mockCCIPRouter.address,
        constructorArguments: mockCCIPRouterArgs,
        contract: "contracts/MockCCIPRouter.sol:MockCCIPRouter",
      });
      log("✅ MockCCIPRouter verified");
    } catch (error) {
      log("❌ MockCCIPRouter verification failed:", error.message);
    }

    log("📝 Verifying MockLINK...");
    try {
      await hre.run("verify:verify", {
        address: mockLINK.address,
        constructorArguments: mockLinkArgs,
        contract: "contracts/MockLINK.sol:MockLINK",
      });
      log("✅ MockLINK verified");
    } catch (error) {
      log("❌ MockLINK verification failed:", error.message);
    }
  }

  log("🎉 Mock CCIP deployment completed!\n");
};

module.exports.tags = ["MockCCIP"];
module.exports.dependencies = [];