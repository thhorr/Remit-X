const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying Mock Price Feeds for testing...");

  // Deploy ETH/USD Price Feed
  const ethUsdFeed = await deploy("MockPriceFeed_ETH_USD", {
    contract: "MockPriceFeed",
    from: deployer,
    args: [
      8, // 8 decimals
      "ETH / USD",
      200000000000 // $2000.00 initial price (8 decimals)
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Deploy USDC/USD Price Feed
  const usdcUsdFeed = await deploy("MockPriceFeed_USDC_USD", {
    contract: "MockPriceFeed",
    from: deployer,
    args: [
      8, // 8 decimals
      "USDC / USD",
      100000000 // $1.00 initial price (8 decimals)
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Deploy USDT/USD Price Feed
  const usdtUsdFeed = await deploy("MockPriceFeed_USDT_USD", {
    contract: "MockPriceFeed",
    from: deployer,
    args: [
      8, // 8 decimals
      "USDT / USD",
      100000000 // $1.00 initial price (8 decimals)
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Deploy DAI/USD Price Feed
  const daiUsdFeed = await deploy("MockPriceFeed_DAI_USD", {
    contract: "MockPriceFeed",
    from: deployer,
    args: [
      8, // 8 decimals
      "DAI / USD",
      100000000 // $1.00 initial price (8 decimals)
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  console.log("Mock Price Feeds deployed:");
  console.log(`ETH/USD: ${ethUsdFeed.address}`);
  console.log(`USDC/USD: ${usdcUsdFeed.address}`);
  console.log(`USDT/USD: ${usdtUsdFeed.address}`);
  console.log(`DAI/USD: ${daiUsdFeed.address}`);
  
  console.log("⚠️  These are MOCK price feeds for testing only!");
};

module.exports.tags = ["MockPriceFeeds"];
module.exports.dependencies = ["MockTokens"];
