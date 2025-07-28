// SENİN KURALLARIN: Deployment script
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SonicWormGame contract...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance));

  // Deploy SonicWormGame
  console.log("\n📦 Deploying SonicWormGame...");
  const GameLogic = await ethers.getContractFactory("contracts/GameLogicV2Simple.sol:SonicWormGameV2Simple");
  const gameLogic = await GameLogic.deploy();
  await gameLogic.waitForDeployment();
  const gameLogicAddress = await gameLogic.getAddress();

  console.log("✅ SonicWormGame deployed to:", gameLogicAddress);

  // Verify deployment
  const lifePrice = await gameLogic.lifePrice();
  const playerCount = await gameLogic.getPlayerCount();

  console.log("📊 SonicWormGameV2Simple Configuration:");
  console.log("   - Life Price:", ethers.formatEther(lifePrice), "Sonic");
  console.log("   - Total Players:", playerCount.toString());

  // Save deployment addresses
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      SonicWormGame: gameLogicAddress
    },
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // For contract verification
  console.log("\n🔑 For contract verification:");
  console.log(`npx hardhat verify --network sonic-testnet ${gameLogicAddress}`);

  console.log("\n✅ Deployment completed successfully!");
  console.log("🎮 Game is ready to play!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 