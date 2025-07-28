const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 ESKİ CONTRACT'TA Sıkışan Oyuncuları Kurtarma...");
  
  // ESKİ kontrat adresi (log'dan gelen)
  const oldContractAddress = "0x3395D36baEB83aD83d7B868083FCb825BF0d7009";
  
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(oldContractAddress, gameLogicAbi, signer);
  
  console.log(`✅ ESKİ Kontrat: ${oldContractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // Log'dan gelen sıkışan oyuncular
  const stuckPlayers = [
    {
      address: "0x85146539B8b2aE8B37C1DB66D36ab45EF3657FB8",
      reason: "Lobby'de takıldı, Game ID: 2"
    },
    {
      address: "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3", 
      reason: "Lobby'de takıldı, Game ID: 3"
    }
  ];
  
  console.log(`\n🚨 ${stuckPlayers.length} sıkışan oyuncu kurtarılacak:`);
  stuckPlayers.forEach((player, index) => {
    console.log(`   ${index + 1}. ${player.address} - ${player.reason}`);
  });
  
  // Önce durumlarını kontrol edelim
  console.log("\n🔍 Mevcut durumları kontrol ediliyor...");
  
  for (let i = 0; i < stuckPlayers.length; i++) {
    const player = stuckPlayers[i];
    
    try {
      const playerData = await gameContract.players(player.address);
      console.log(`\n👤 ${player.address}:`);
      console.log(`   Lives: ${playerData.lives}`);
      console.log(`   Is Active: ${playerData.isActive}`);
      console.log(`   Current Game ID: ${playerData.currentGameId}`);
      console.log(`   Is Registered: ${playerData.isRegistered}`);
      
      // Game durumunu kontrol et
      if (playerData.currentGameId > 0) {
        try {
          const gameData = await gameContract.games(playerData.currentGameId);
          console.log(`   Game Status: Reserved=${gameData.isReserved}, Completed=${gameData.isCompleted}, LifeConsumed=${gameData.lifeConsumed}`);
        } catch (e) {
          console.log(`   Game bilgisi alınamadı: ${e.message}`);
        }
      }
      
    } catch (error) {
      console.log(`\n❌ ${player.address} bilgileri alınamadı: ${error.message}`);
    }
  }
  
  // Şimdi kurtarma işlemi
  console.log("\n🔧 Kurtarma işlemi başlıyor...");
  
  for (let i = 0; i < stuckPlayers.length; i++) {
    const player = stuckPlayers[i];
    console.log(`\n🔄 ${i + 1}/${stuckPlayers.length} Kurtarılıyor: ${player.address}`);
    
    try {
      // Admin emergency reset player
      const tx = await gameContract.adminEmergencyResetPlayer(player.address, {
        gasLimit: 500000
      });
      
      console.log(`   📝 Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`   ✅ Başarıyla kurtarıldı! Gas: ${receipt.gasUsed}`);
        
        // Kurtarma sonrası kontrol
        const updatedPlayer = await gameContract.players(player.address);
        console.log(`   📊 Yeni durum: Lives=${updatedPlayer.lives}, Active=${updatedPlayer.isActive}, GameID=${updatedPlayer.currentGameId}`);
      } else {
        console.log(`   ❌ Transaction başarısız!`);
      }
      
    } catch (error) {
      console.log(`   ❌ Kurtarma hatası: ${error.message}`);
      
      if (error.reason) {
        console.log(`   💡 Sebep: ${error.reason}`);
      }
    }
    
    // Her işlem arasında 2 saniye bekle
    if (i < stuckPlayers.length - 1) {
      console.log("   ⏱️ 2 saniye bekleniyor...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log("\n🎉 ESKİ CONTRACT kurtarma işlemi tamamlandı!");
  console.log("\n📋 Şimdi yapılması gerekenler:");
  console.log("1. ✅ Server'ı restart edin (yeni contract adresi için)");
  console.log("2. ✅ Oyuncular browser'larını yenilesin");
  console.log("3. ✅ Yeni contract ile oyun test edin");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });