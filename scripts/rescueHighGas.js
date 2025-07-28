const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 YÜKSEK GAS ile Sıkışan Oyuncuları Kurtarma...");
  
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Kontrat: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // Sıkışan oyuncular (manuel tarama sonucu)
  const stuckPlayers = [
    "0x85146539B8b2aE8B37C1DB66D36ab45EF3657FB8",
    "0x4b1178b379c8E059e3EFFe3ca3A00310050e8fB4"
  ];
  
  console.log(`\n🚨 ${stuckPlayers.length} oyuncu kurtarılacak (rezerve oyunlar)`);
  
  // Gas fiyatını yüksek ayarla
  const gasPrice = ethers.parseUnits("2", "gwei"); // 2 Gwei
  console.log(`⛽ Gas fiyatı: ${ethers.formatUnits(gasPrice, "gwei")} Gwei`);
  
  for (let i = 0; i < stuckPlayers.length; i++) {
    const playerAddress = stuckPlayers[i];
    console.log(`\n🔄 ${i + 1}/${stuckPlayers.length} Kurtarılıyor: ${playerAddress}`);
    
    try {
      // Önce mevcut durumu kontrol et
      const player = await gameContract.players(playerAddress);
      console.log(`   📊 Mevcut: Lives=${player.lives}, Active=${player.isActive}, GameID=${player.currentGameId}`);
      
      // Yüksek gas ile kurtarma işlemi
      const tx = await gameContract.adminEmergencyResetPlayer(playerAddress, {
        gasLimit: 500000,
        gasPrice: gasPrice
      });
      
      console.log(`   📝 Transaction: ${tx.hash}`);
      console.log(`   ⏳ Onay bekleniyor...`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`   ✅ BAŞARILI! Gas kullanımı: ${receipt.gasUsed}`);
        
        // Sonucu kontrol et
        const updatedPlayer = await gameContract.players(playerAddress);
        console.log(`   📊 Sonuç: Lives=${updatedPlayer.lives}, Active=${updatedPlayer.isActive}, GameID=${updatedPlayer.currentGameId}`);
        
        if (!updatedPlayer.isActive && updatedPlayer.currentGameId == 0) {
          console.log(`   🎉 MÜKEMMEL - Oyuncu tamamen temizlendi!`);
        } else {
          console.log(`   ⚠️ Kısmen başarılı - tekrar kontrol gerekebilir`);
        }
        
      } else {
        console.log(`   ❌ Transaction başarısız: Status ${receipt.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Hata: ${error.message}`);
      
      if (error.message.includes("underpriced")) {
        console.log(`   💡 Gas fiyatı hala düşük - daha yüksek deneyin`);
      } else if (error.message.includes("Player is not active")) {
        console.log(`   💡 Oyuncu zaten aktif değil - sorun yok`);
      }
    }
    
    // Her işlem arasında 2 saniye bekle
    if (i < stuckPlayers.length - 1) {
      console.log("   ⏱️ 2 saniye bekleniyor...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log("\n🎉 Yüksek gas ile kurtarma işlemi tamamlandı!");
  
  // Final kontrol
  console.log("\n🔍 Final kontrol yapılıyor...");
  for (const playerAddress of stuckPlayers) {
    try {
      const player = await gameContract.players(playerAddress);
      const status = (!player.isActive && player.currentGameId == 0) ? "✅ TEMIZ" : "⚠️ KONTROL ET";
      console.log(`   ${playerAddress}: ${status} (Lives=${player.lives}, Active=${player.isActive}, GameID=${player.currentGameId})`);
    } catch (e) {
      console.log(`   ${playerAddress}: ❌ Kontrol edilemedi`);
    }
  }
  
  console.log("\n💡 Kurtarma tamamlandı! Server restart etmeyi unutmayın.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });