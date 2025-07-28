const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Contract Owner Kontrolü...");
  
  // Kontrat bağlantısı
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Kontrat adresi: ${contractAddress}`);
  console.log(`✅ Signer adresi: ${signer.address}`);
  
  try {
    // Contract owner'ını al
    const owner = await gameContract.owner();
    console.log(`🔑 Contract owner: ${owner}`);
    
    // Aynı mı kontrol et
    const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
    console.log(`📋 Signer owner mu? ${isOwner ? 'EVET ✅' : 'HAYIR ❌'}`);
    
    if (!isOwner) {
      console.log("\n⚠️ Sorun: Signer contract owner değil!");
      console.log("💡 Çözüm: Owner account ile bağlanmalıyız.");
    } else {
      console.log("\n✅ Signer yetkili! Cüzdan ayarlama işlemine geçebilirsiniz.");
    }
    
    // Mevcut cüzdan durumlarını kontrol et
    console.log("\n📊 Mevcut Cüzdan Durumları:");
    
    try {
      const prizePool = await gameContract.prizePoolWallet();
      console.log(`🏆 Prize Pool: ${prizePool}`);
    } catch (e) {
      console.log(`🏆 Prize Pool: Ayarlanmamış (${e.message})`);
    }
    
    try {
      const weekly = await gameContract.weeklyRewardPool();
      console.log(`📅 Weekly Reward: ${weekly}`);
    } catch (e) {
      console.log(`📅 Weekly Reward: Ayarlanmamış (${e.message})`);
    }
    
    try {
      const developer = await gameContract.developerFund();
      console.log(`👨‍💻 Developer Fund: ${developer}`);
    } catch (e) {
      console.log(`👨‍💻 Developer Fund: Ayarlanmamış (${e.message})`);
    }
    
    try {
      const liquidity = await gameContract.liquidityFund();
      console.log(`💧 Liquidity Fund: ${liquidity}`);
    } catch (e) {
      console.log(`💧 Liquidity Fund: Ayarlanmamış (${e.message})`);
    }
    
  } catch (error) {
    console.error("❌ Kontrol hatası:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });