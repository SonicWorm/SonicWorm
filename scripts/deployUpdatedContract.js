const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🚀 Updated Contract Deployment Başlıyor...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying account:", deployer.address);
  
  // Deploy updated contract with 4-wallet system
  console.log("\n📦 SonicWormGameV2Simple deploy ediliyor...");
  const GameContract = await ethers.getContractFactory("SonicWormGameV2Simple");
  const gameContract = await GameContract.deploy();
  
  await gameContract.waitForDeployment();
  const contractAddress = await gameContract.getAddress();
  
  console.log("✅ Contract deployed to:", contractAddress);
  
  // Set initial wallet addresses
  console.log("\n💰 4 Cüzdan Sistemi Ayarlanıyor...");
  
  const walletAddresses = {
    prizePoolWallet: "0x4b1178b379c8E059e3EFFe3ca3A00310050e8fB4",      // %60 = 3 S
    weeklyRewardPool: "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3",     // %20 = 1 S
    developerFund: "0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629",        // %15 = 0.75 S
    liquidityFund: "0x3F0b441FFAeDaB9cdb25e0953a5e6c9779f8F81D"         // %5 = 0.25 S
  };
  
  try {
    // 1. Prize Pool Wallet
    console.log("🏆 Prize Pool Wallet ayarlanıyor...");
    let tx = await gameContract.setPrizePoolWallet(walletAddresses.prizePoolWallet);
    await tx.wait();
    console.log("✅ Prize Pool Wallet ayarlandı");
    
    // 2. Weekly Reward Pool
    console.log("📅 Weekly Reward Pool ayarlanıyor...");
    tx = await gameContract.setWeeklyRewardPool(walletAddresses.weeklyRewardPool);
    await tx.wait();
    console.log("✅ Weekly Reward Pool ayarlandı");
    
    // 3. Developer Fund
    console.log("👨‍💻 Developer Fund ayarlanıyor...");
    tx = await gameContract.setDeveloperFund(walletAddresses.developerFund);
    await tx.wait();
    console.log("✅ Developer Fund ayarlandı");
    
    // 4. Liquidity Fund
    console.log("💧 Liquidity Fund ayarlanıyor...");
    tx = await gameContract.setLiquidityFund(walletAddresses.liquidityFund);
    await tx.wait();
    console.log("✅ Liquidity Fund ayarlandı");
    
    console.log("\n🎉 4 Cüzdan Sistemi Tamamlandı!");
    
    // Verification
    console.log("\n🔍 Doğrulama:");
    const prizePool = await gameContract.prizePoolWallet();
    const weekly = await gameContract.weeklyRewardPool();
    const developer = await gameContract.developerFund();
    const liquidity = await gameContract.liquidityFund();
    
    console.log(`🏆 Prize Pool (60%): ${prizePool}`);
    console.log(`📅 Weekly Reward (20%): ${weekly}`);
    console.log(`👨‍💻 Developer Fund (15%): ${developer}`);
    console.log(`💧 Liquidity Fund (5%): ${liquidity}`);
    
    console.log("\n📋 Environment Variables:");
    console.log(`VITE_GAME_CONTRACT_ADDRESS_TESTNET=${contractAddress}`);
    console.log("\n💡 Bu adresi .env dosyasına güncelleyiniz!");
    
  } catch (error) {
    console.error("❌ Wallet ayarlama hatası:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment hatası:", error);
    process.exit(1);
  });