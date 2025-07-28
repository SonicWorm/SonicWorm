const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 Sıkışan hesapları kurtarma işlemi başlıyor...");
  
  // Kontrat bağlantısı
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Kontrat bağlandı: ${contractAddress}`);
  console.log(`🔑 Admin address: ${signer.address}`);
  
  // Sıkışan hesapları tespit et
  const stuckPlayers = [
    // Buraya sıkışan hesap adreslerini ekleyeceğiz
    // Örnek: "0x1234567890abcdef1234567890abcdef12345678"
  ];
  
  // Eğer belirli adresler verilmediyse, aktif oyuncuları tara
  if (stuckPlayers.length === 0) {
    console.log("🔍 Aktif oyuncuları taranıyor...");
    
    // Toplam oyuncu sayısını al
    const totalPlayers = await gameContract.totalPlayers();
    console.log(`📊 Toplam oyuncu sayısı: ${totalPlayers}`);
    
    // İlk 10 oyuncuyu kontrol et (örnek)
    const playerCount = Math.min(10, Number(totalPlayers));
    for (let i = 0; i < playerCount; i++) {
      try {
        const playerAddress = await gameContract.playerList(i);
        const player = await gameContract.players(playerAddress);
        
        console.log(`\n👤 Oyuncu ${i + 1}: ${playerAddress}`);
        console.log(`   Lives: ${player.lives}`);
        console.log(`   Is Active: ${player.isActive}`);
        console.log(`   Current Game ID: ${player.currentGameId}`);
        console.log(`   Total Games: ${player.totalGamesPlayed}`);
        
        // Sıkışan oyuncu kriterleri:
        // 1. Aktif ama can yok
        // 2. Oyunda ama oyun tamamlanmamış
        if (player.isActive && player.lives == 0) {
          stuckPlayers.push(playerAddress);
          console.log(`   ⚠️ SIKIŞMIŞ: Aktif ama can yok!`);
        }
        
        if (player.currentGameId > 0) {
          const game = await gameContract.games(player.currentGameId);
          if (!game.isCompleted && game.lifeConsumed) {
            stuckPlayers.push(playerAddress);
            console.log(`   ⚠️ SIKIŞMIŞ: Oyunda ama tamamlanmamış!`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Oyuncu ${i + 1} kontrol edilemedi:`, error.message);
      }
    }
  }
  
  if (stuckPlayers.length === 0) {
    console.log("✅ Sıkışan oyuncu bulunamadı!");
    return;
  }
  
  console.log(`\n🚨 ${stuckPlayers.length} sıkışan oyuncu bulundu:`);
  stuckPlayers.forEach((addr, index) => {
    console.log(`   ${index + 1}. ${addr}`);
  });
  
  // Sıkışan oyuncuları sıfırla
  console.log("\n🔧 Sıkışan oyuncuları sıfırlama işlemi başlıyor...");
  
  for (let i = 0; i < stuckPlayers.length; i++) {
    const playerAddress = stuckPlayers[i];
    console.log(`\n🔄 ${i + 1}/${stuckPlayers.length} Sıfırlanıyor: ${playerAddress}`);
    
    try {
      // Admin emergency reset player fonksiyonunu çağır
      const tx = await gameContract.adminEmergencyResetPlayer(playerAddress, {
        gasLimit: 500000
      });
      
      console.log(`   📝 Transaction gönderildi: ${tx.hash}`);
      
      // Transaction'ın onaylanmasını bekle
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`   ✅ Başarıyla sıfırlandı! Gas kullanımı: ${receipt.gasUsed}`);
      } else {
        console.log(`   ❌ Transaction başarısız!`);
      }
      
      // Sıfırlama sonrası durumu kontrol et
      const player = await gameContract.players(playerAddress);
      console.log(`   📊 Yeni durum: Lives=${player.lives}, Active=${player.isActive}, GameID=${player.currentGameId}`);
      
    } catch (error) {
      console.log(`   ❌ Sıfırlama hatası: ${error.message}`);
      
      // Hata detayları
      if (error.reason) {
        console.log(`   💡 Hata sebebi: ${error.reason}`);
      }
    }
    
    // Her işlem arasında 2 saniye bekle
    if (i < stuckPlayers.length - 1) {
      console.log("   ⏱️ 2 saniye bekleniyor...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log("\n🎉 Sıkışan hesapları kurtarma işlemi tamamlandı!");
  console.log("💡 Tüm oyuncular artık normal şekilde oyun oynayabilir.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });