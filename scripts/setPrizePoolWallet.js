const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🏆 Prize Pool Wallet Ayarlama İşlemi...");
  
  // Kontrat bağlantısı
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Kontrat: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  const prizePoolWallet = "0x4b1178b379c8E059e3EFFe3ca3A00310050e8fB4";
  console.log(`🏆 Ayarlanacak Prize Pool Wallet: ${prizePoolWallet}`);
  
  try {
    // Prize Pool Wallet ayarla
    console.log("\n🏆 Prize Pool Wallet ayarlanıyor...");
    const tx = await gameContract.setPrizePoolWallet(prizePoolWallet, {
      gasLimit: 200000
    });
    console.log(`📝 Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed! Gas used: ${receipt.gasUsed}`);
    
    // Kontrol et
    console.log("\n🔍 Kontrol ediliyor...");
    const setPrizePool = await gameContract.prizePoolWallet();
    console.log(`✅ Prize Pool Wallet: ${setPrizePool}`);
    
    if (setPrizePool.toLowerCase() === prizePoolWallet.toLowerCase()) {
      console.log("\n🎉 Prize Pool Wallet başarıyla ayarlandı!");
      console.log("\n💰 Artık 4 Cüzdan Sistemi Aktif:");
      console.log(`🏆 Prize Pool (60% = 3 S): ${setPrizePool}`);
      
      // Diğer cüzdanları da göster
      const weekly = await gameContract.weeklyRewardPool();
      const developer = await gameContract.developerFund();  
      const liquidity = await gameContract.liquidityFund();
      
      console.log(`📅 Weekly Reward (20% = 1 S): ${weekly}`);
      console.log(`👨‍💻 Developer Fund (15% = 0.75 S): ${developer}`);
      console.log(`💧 Liquidity Fund (5% = 0.25 S): ${liquidity}`);
      
      console.log("\n✨ Sistem Hazır! Oyuncular 5 S ödediğinde otomatik dağıtım yapılacak.");
    } else {
      console.log("\n⚠️ Adres yanlış ayarlanmış!");
    }
    
  } catch (error) {
    console.error("\n❌ Prize Pool Wallet ayarlama hatası:", error.message);
    
    if (error.reason) {
      console.error(`💡 Hata sebebi: ${error.reason}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });