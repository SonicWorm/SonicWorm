const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 YENİ CONTRACT'TA Sıkışan Oyuncuları Kurtarma...");
  
  // YENİ kontrat bağlantısı
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ YENİ Kontrat: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  try {
    // Toplam oyuncu sayısını al
    const totalPlayers = await gameContract.totalPlayers();
    console.log(`📊 Toplam oyuncu sayısı: ${totalPlayers}`);
    
    const stuckPlayers = [];
    
    if (totalPlayers > 0) {
      console.log("\n🔍 Oyuncuları taranıyor...");
      
      const playerCount = Math.min(20, Number(totalPlayers)); // İlk 20 oyuncuyu kontrol et
      
      for (let i = 0; i < playerCount; i++) {
        try {
          const playerAddress = await gameContract.playerList(i);
          const player = await gameContract.players(playerAddress);
          
          console.log(`\n👤 Oyuncu ${i + 1}: ${playerAddress}`);
          console.log(`   Lives: ${player.lives}`);
          console.log(`   Is Active: ${player.isActive}`);
          console.log(`   Current Game ID: ${player.currentGameId}`);
          console.log(`   Is Registered: ${player.isRegistered}`);
          
          // Sıkışan oyuncu kriterleri:
          let isStuck = false;
          let reason = "";
          
          // 1. Aktif ama can yok
          if (player.isActive && player.lives == 0) {
            isStuck = true;
            reason = "Aktif ama can yok";
          }
          
          // 2. Oyunda ama oyun tamamlanmamış
          if (player.currentGameId > 0) {
            try {
              const game = await gameContract.games(player.currentGameId);
              if (!game.isCompleted && game.lifeConsumed) {
                isStuck = true;
                reason = "Oyunda ama tamamlanmamış";
              }
            } catch (e) {
              console.log(`   ⚠️ Game ${player.currentGameId} kontrol edilemedi: ${e.message}`);
            }
          }
          
          if (isStuck) {
            stuckPlayers.push({
              address: playerAddress,
              reason: reason,
              lives: Number(player.lives),
              gameId: Number(player.currentGameId),
              isActive: player.isActive
            });
            console.log(`   🚨 SIKIŞMIŞ: ${reason}`);
          } else {
            console.log(`   ✅ Normal durum`);
          }
          
        } catch (error) {
          console.log(`   ❌ Oyuncu ${i + 1} kontrol edilemedi: ${error.message}`);
        }
      }
    }
    
    if (stuckPlayers.length === 0) {
      console.log("\n✅ Hiç sıkışan oyuncu bulunamadı! Tüm oyuncular normal durumda.");
      return;
    }
    
    console.log(`\n🚨 ${stuckPlayers.length} sıkışan oyuncu bulundu:`);
    stuckPlayers.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.address}`);
      console.log(`      Sebep: ${player.reason}`);
      console.log(`      Lives: ${player.lives}, Game ID: ${player.gameId}, Active: ${player.isActive}`);
    });
    
    // Sıkışan oyuncuları kurtarma işlemi
    console.log("\n🔧 Sıkışan oyuncuları kurtarma işlemi başlıyor...");
    
    for (let i = 0; i < stuckPlayers.length; i++) {
      const player = stuckPlayers[i];
      console.log(`\n🔄 ${i + 1}/${stuckPlayers.length} Kurtarılıyor: ${player.address}`);
      console.log(`   Sebep: ${player.reason}`);
      
      try {
        // Admin emergency reset player fonksiyonunu çağır
        const tx = await gameContract.adminEmergencyResetPlayer(player.address, {
          gasLimit: 500000
        });
        
        console.log(`   📝 Transaction: ${tx.hash}`);
        
        // Transaction'ın onaylanmasını bekle
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`   ✅ Başarıyla kurtarıldı! Gas: ${receipt.gasUsed}`);
          
          // Kurtarma sonrası durumu kontrol et
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
        
        // Specific error handling
        if (error.message.includes("Player is not active")) {
          console.log(`   💡 Bu oyuncu zaten aktif değil, kurtarma gereksiz.`);
        }
      }
      
      // Her işlem arasında 2 saniye bekle
      if (i < stuckPlayers.length - 1) {
        console.log("   ⏱️ 2 saniye bekleniyor...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log("\n🎉 Sıkışan oyuncuları kurtarma işlemi tamamlandı!");
    console.log("💡 Tüm oyuncular artık normal şekilde oyun oynayabilir.");
    console.log("🔄 Gerekirse oyuncular browser'larını yenilesinler.");
    
  } catch (error) {
    console.error("\n❌ Genel hata:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });