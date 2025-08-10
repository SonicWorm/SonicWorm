const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SonicWormGameV2Simple to Sonic MAINNET...");

  // Get the ContractFactory and Signers here
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString(), "wei");

  // Deploy the contract
  const GameContract = await hre.ethers.getContractFactory("SonicWormGameV2Simple");
  const gameContract = await GameContract.deploy();

  await gameContract.deployed();

  console.log("✅ SonicWormGameV2Simple deployed to:", gameContract.address);

  // Setup contract with 4-wallet system
  console.log("\n🔧 Setting up 4-wallet revenue distribution...");
  
  // PLACEHOLDER ADDRESSES - REPLACE WITH ACTUAL WALLET ADDRESSES
  const PRIZE_POOL_WALLET = "0x1234567890123456789012345678901234567890"; // %60 - Prize Pool
  const WEEKLY_REWARD_POOL = "0x2345678901234567890123456789012345678901"; // %20 - Weekly Rewards
  const DEVELOPER_FUND = "0x3456789012345678901234567890123456789012"; // %15 - Developer Fund
  const LIQUIDITY_FUND = "0x4567890123456789012345678901234567890123"; // %5 - Liquidity Fund
  
  console.log("WARNING: Using placeholder addresses! Replace with actual wallet addresses.");
  
  // Set up the 4-wallet system
  console.log("Setting prize pool wallet...");
  await gameContract.setPrizePoolWallet(PRIZE_POOL_WALLET);
  
  console.log("Setting weekly reward pool...");
  await gameContract.setWeeklyRewardPool(WEEKLY_REWARD_POOL);
  
  console.log("Setting developer fund...");
  await gameContract.setDeveloperFund(DEVELOPER_FUND);
  
  console.log("Setting liquidity fund...");
  await gameContract.setLiquidityFund(LIQUIDITY_FUND);
  
  // Set server address (Railway server will need permission to call server functions)
  console.log("Setting server address...");
  await gameContract.setServer(deployer.address); // For now, use deployer as server
  
  console.log("✅ 4-wallet system configured!");
  
  console.log("\n📋 MAINNET Deployment Summary:");
  console.log("==========================================");
  console.log("Contract Address:", gameContract.address);
  console.log("Network: Sonic Mainnet (Chain ID: 146)");
  console.log("Owner:", deployer.address);
  console.log("Life Price:", hre.ethers.utils.formatEther(await gameContract.lifePrice()), "S");
  console.log("");
  console.log("4-Wallet Distribution:");
  console.log("Prize Pool (60%):", PRIZE_POOL_WALLET);
  console.log("Weekly Rewards (20%):", WEEKLY_REWARD_POOL);
  console.log("Developer Fund (15%):", DEVELOPER_FUND);
  console.log("Liquidity Fund (5%):", LIQUIDITY_FUND);
  console.log("==========================================");
  
  console.log("\n🔄 Update your .env file with:");
  console.log(`VITE_GAME_CONTRACT_ADDRESS_MAINNET=${gameContract.address}`);
  console.log(`VITE_CHAIN_ID=146`);
  
  console.log("\n⚠️  IMPORTANT: Update frontend to use MAINNET configuration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });