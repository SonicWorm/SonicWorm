// SENİN KURALLARIN: Deployment script
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying SonicWormGame contract...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy SonicWormGame
  console.log("\n📦 Deploying SonicWormGame...");
  const GameLogic = await ethers.getContractFactory("SonicWormGame");
  const gameLogic = await GameLogic.deploy();
  await gameLogic.waitForDeployment();
  const gameLogicAddress = await gameLogic.getAddress();

  console.log("✅ SonicWormGame deployed to:", gameLogicAddress);

  // Verify deployment
  const lifePrice = await gameLogic.lifePrice();
  const maxLives = await gameLogic.MAX_LIVES();
  const totalPlayers = await gameLogic.totalPlayers();
  const gameCounter = await gameLogic.gameCounter();

  console.log("📊 SonicWormGame Configuration:");
  console.log("   - Life Price:", ethers.formatEther(lifePrice), "Sonic");
  console.log("   - Max Lives:", maxLives.toString());
  console.log("   - Total Players:", totalPlayers.toString());
  console.log("   - Game Counter:", gameCounter.toString());

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