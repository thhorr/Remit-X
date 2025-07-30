const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying mock tokens...");

  // Deploy Mock USDC
  const mockUSDC = await deploy("MockUSDC", {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Deploy Mock USDT
  const mockUSDT = await deploy("MockUSDT", {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Deploy Mock DAI
  const mockDAI = await deploy("MockDAI", {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  console.log("Mock tokens deployed:");
  console.log(`USDC: ${mockUSDC.address}`);
  console.log(`USDT: ${mockUSDT.address}`);
  console.log(`DAI: ${mockDAI.address}`);
};

module.exports.tags = ["MockTokens"];
module.exports.dependencies = [];
