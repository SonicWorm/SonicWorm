const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 YENİ CONTRACT'TA DETAYLI Sıkışan Oyuncu Taraması...");
  
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
      console.log("\n🔍 TÜM oyuncuları detaylı taranıyor...");
      
      const playerCount = Number(totalPlayers); // Tüm oyuncuları kontrol et
      
      for (let i = 0; i < playerCount; i++) {
        try {
          const playerAddress = await gameContract.playerList(i);
          const player = await gameContract.players(playerAddress);
          
          console.log(`\n👤 Oyuncu ${i + 1}: ${playerAddress}`);
          console.log(`   Lives: ${player.lives}`);
          console.log(`   Is Active: ${player.isActive}`);
          console.log(`   Current Game ID: ${player.currentGameId}`);
          console.log(`   Is Registered: ${player.isRegistered}`);
          console.log(`   Total Games: ${player.totalGamesPlayed}`);
          
          // DETAYLI SIKIŞMA KRİTERLERİ
          let isStuck = false;
          let reason = "";
          
          // 1. Aktif ama can yok - KRİTİK
          if (player.isActive && player.lives == 0) {
            isStuck = true;
            reason = "Aktif ama can yok (kritik)";
          }
          
          // 2. Aktif ve oyunda ama oyun durumu problemli
          if (player.isActive && player.currentGameId > 0) {
            try {
              const game = await gameContract.games(player.currentGameId);
              console.log(`   Game Info: Reserved=${game.isReserved}, Completed=${game.isCompleted}, LifeConsumed=${game.lifeConsumed}`);
              console.log(`   Game Times: Start=${game.startTime}, End=${game.endTime}`);
              
              // Oyun tamamlanmamış ama can harcanmış
              if (!game.isCompleted && game.lifeConsumed) {
                isStuck = true;
                reason = "Oyunda ama tamamlanmamış (can harcanmış)";
              }
              
              // Sadece rezerve edilmiş ama başlamamış ve uzun süre geçmiş
              if (game.isReserved && !game.lifeConsumed && game.startTime == 0) {
                const currentTime = Math.floor(Date.now() / 1000);
                // 10 dakikadan fazla rezerve kalmışsa
                if (currentTime - Number(game.startTime) > 600) {
                  isStuck = true;
                  reason = "Rezerve oyun çok uzun süre beklemede";
                }
              }
              
              // Oyun başlamış ama bitmemiş ve çok uzun süre geçmiş (5 dakikadan fazla)
              if (game.startTime > 0 && !game.isCompleted && game.lifeConsumed) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (currentTime - Number(game.startTime) > 300) { // 5 dakika
                  isStuck = true;
                  reason = "Oyun çok uzun süredir devam ediyor (5+ dakika)";
                }
              }
              
            } catch (gameError) {
              console.log(`   ❌ Game ${player.currentGameId} bilgisi alınamadı: ${gameError.message}`);
              isStuck = true;
              reason = "Game bilgisi alınamıyor (corrupt data)";
            }
          }
          
          // 3. Can var ama aktif değil (potansiyel sorun)
          if (!player.isActive && player.lives > 0 && player.currentGameId > 0) {
            isStuck = true;
            reason = "Can var ama aktif değil (potansiyel sorun)";
          }
          
          if (isStuck) {
            stuckPlayers.push({
              address: playerAddress,
              reason: reason,
              lives: Number(player.lives),
              gameId: Number(player.currentGameId),
              isActive: player.isActive,
              isRegistered: player.isRegistered,
              totalGames: Number(player.totalGamesPlayed)
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
      console.log(`\n   ${index + 1}. ${player.address}`);
      console.log(`      Sebep: ${player.reason}`);
      console.log(`      Lives: ${player.lives}, Game ID: ${player.gameId}`);
      console.log(`      Active: ${player.isActive}, Total Games: ${player.totalGames}`);
    });
    
    console.log("\n❓ Bu oyuncuları kurtarmak istiyor musunuz? (y/n)");
    console.log("⚠️ 5 saniye içinde otomatik başlayacak...");
    
    // 5 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Sıkışan oyuncuları kurtarma işlemi
    console.log("\n🔧 Sıkışan oyuncuları kurtarma işlemi başlıyor...");
    
    for (let i = 0; i < stuckPlayers.length; i++) {
      const player = stuckPlayers[i];
      console.log(`\n🔄 ${i + 1}/${stuckPlayers.length} Kurtarılıyor: ${player.address}`);
      console.log(`   Sebep: ${player.reason}`);
      console.log(`   Mevcut durum: Lives=${player.lives}, GameID=${player.gameId}, Active=${player.isActive}`);
      
      try {
        // Admin emergency reset player fonksiyonunu çağır
        const tx = await gameContract.adminEmergencyResetPlayer(player.address, {
          gasLimit: 500000,
          gasPrice: "1000000001" // 1 gwei + 1 wei
        });
        
        console.log(`   📝 Transaction gönderildi: ${tx.hash}`);
        
        // Transaction'ın onaylanmasını bekle
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`   ✅ Başarıyla kurtarıldı! Gas kullanımı: ${receipt.gasUsed}`);
          
          // Kurtarma sonrası durumu kontrol et
          const updatedPlayer = await gameContract.players(player.address);
          console.log(`   📊 Yeni durum: Lives=${updatedPlayer.lives}, Active=${updatedPlayer.isActive}, GameID=${updatedPlayer.currentGameId}`);
          
          // Başarı değerlendirmesi
          if (!updatedPlayer.isActive && updatedPlayer.currentGameId == 0) {
            console.log(`   🎉 Kurtarma BAŞARILI - Oyuncu artık temiz durumda!`);
          } else {
            console.log(`   ⚠️ Kurtarma kısmen başarılı - Manuel kontrol gerekebilir`);
          }
          
        } else {
          console.log(`   ❌ Transaction başarısız! Status: ${receipt.status}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Kurtarma hatası: ${error.message}`);
        
        if (error.reason) {
          console.log(`   💡 Blockchain sebebi: ${error.reason}`);
        }
        
        // Specific error handling
        if (error.message.includes("Player is not active")) {
          console.log(`   💡 Bu oyuncu zaten aktif değil, kurtarma gereksiz olabilir.`);
        } else if (error.message.includes("revert")) {
          console.log(`   💡 Kontrat seviyesinde revert - muhtemelen zaten temiz.`);
        }
      }
      
      // Her işlem arasında 3 saniye bekle
      if (i < stuckPlayers.length - 1) {
        console.log("   ⏱️ 3 saniye bekleniyor...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log("\n🎉 Detaylı kurtarma işlemi tamamlandı!");
    console.log("💡 Öneriler:");
    console.log("   1. Server'ı restart edin");
    console.log("   2. Oyunculara browser yenileme önerin");
    console.log("   3. Yeni oyun denemeleri yapın");
    
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