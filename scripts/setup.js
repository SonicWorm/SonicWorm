// SENİN KURALLARIN: Contract Setup Script
const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Setting up SonicWormGame contract...");

  // Contract address (yeni deploy edilen)
  const contractAddress = "0x64B980272e2aa302Ea50FCDFF2389879CAcF7608";
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Setting up with account:", deployer.address);

  // Connect to deployed contract
  const GameLogic = await ethers.getContractFactory("contracts/GameLogicFixed.sol:SonicWormGame");
  const contract = GameLogic.attach(contractAddress);

  console.log("✅ Connected to contract at:", contractAddress);

  try {
    // Set Developer Fund
    console.log("\n💼 Setting Developer Fund...");
    const tx1 = await contract.setDeveloperFund("0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629");
    await tx1.wait();
    console.log("✅ Developer Fund set successfully");

    // Set Weekly Reward Pool
    console.log("\n🏆 Setting Weekly Reward Pool...");
    const tx2 = await contract.setWeeklyRewardPool("0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3");
    await tx2.wait();
    console.log("✅ Weekly Reward Pool set successfully");

    // Set Liquidity Fund
    console.log("\n💧 Setting Liquidity Fund...");
    const tx3 = await contract.setLiquidityFund("0x3F0b441FFAeDaB9cdb25e0953a5e6c9779f8F81D");
    await tx3.wait();
    console.log("✅ Liquidity Fund set successfully");

    // Set Server Address (your deployer address as server for now)
    console.log("\n🖥️ Setting Server Address...");
    const tx4 = await contract.setServer(deployer.address);
    await tx4.wait();
    console.log("✅ Server Address set successfully");

    console.log("\n📊 Contract Configuration Summary:");
    const developerFund = await contract.developerFund();
    const weeklyRewardPool = await contract.weeklyRewardPool();
    const liquidityFund = await contract.liquidityFund();
    const server = await contract.server();
    const lifePrice = await contract.lifePrice();

    console.log("   - Developer Fund:", developerFund);
    console.log("   - Weekly Reward Pool:", weeklyRewardPool);
    console.log("   - Liquidity Fund:", liquidityFund);
    console.log("   - Server Address:", server);
    console.log("   - Life Price:", ethers.formatEther(lifePrice), "Sonic");

    console.log("\n🎉 Contract setup completed successfully!");
    console.log("🎮 Game is ready for players!");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });