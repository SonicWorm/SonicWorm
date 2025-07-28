const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Sıkışan Oyuncuları Tarama...");
  
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // Son 100 oyuncu adresini kontrol et (test için)
  const knownAddresses = [
    "0x85146539B8b2aE8B37C1DB66D36ab45EF3657FB8",
    "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3",
    "0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629",
    "0x4b1178b379c8E059e3EFFe3ca3A00310050e8fB4"
  ];
  
  const stuckPlayers = [];
  
  console.log("\n🔍 Bilinen adresleri kontrol ediliyor...");
  
  for (const address of knownAddresses) {
    try {
      const player = await gameContract.players(address);
      
      if (player.isRegistered) {
        console.log(`\n👤 ${address}:`);
        console.log(`   Lives: ${player.lives}`);
        console.log(`   Is Active: ${player.isActive}`);
        console.log(`   Current Game ID: ${player.currentGameId}`);
        console.log(`   Total Games: ${player.totalGamesPlayed}`);
        
        // Sıkışma durumları
        let isStuck = false;
        const issues = [];
        
        if (player.isActive && player.currentGameId > 0) {
          // Aktif oyunda game durumunu kontrol et
          try {
            const game = await gameContract.games(player.currentGameId);
            console.log(`   Game ${player.currentGameId}:`);
            console.log(`     Reserved: ${game.isReserved}`);
            console.log(`     Completed: ${game.isCompleted}`);
            console.log(`     Life Consumed: ${game.lifeConsumed}`);
            
            // Sıkışma kontrolleri
            if (game.isReserved && !game.lifeConsumed) {
              isStuck = true;
              issues.push("Game reserved but life not consumed");
            }
            
            if (game.lifeConsumed && !game.isCompleted) {
              isStuck = true;
              issues.push("Life consumed but game not completed");
            }
            
            // Çok eski rezervasyon
            if (game.isReserved && game.startTime == 0) {
              const now = Math.floor(Date.now() / 1000);
              if (now - game.startTime > 3600) { // 1 saat
                isStuck = true;
                issues.push("Game reserved for too long");
              }
            }
            
          } catch (e) {
            console.log(`   ❌ Game bilgisi alınamadı: ${e.message}`);
            isStuck = true;
            issues.push("Cannot read game data");
          }
        }
        
        if (player.isActive && player.currentGameId == 0) {
          isStuck = true;
          issues.push("Active but no current game");
        }
        
        if (player.lives <= 0 && player.isActive) {
          isStuck = true;
          issues.push("No lives but still active");
        }
        
        if (isStuck) {
          console.log(`   🚨 SIKIŞMIŞ: ${issues.join(", ")}`);
          stuckPlayers.push({
            address: address,
            issues: issues,
            player: player
          });
        } else {
          console.log(`   ✅ NORMAL`);
        }
      } else {
        console.log(`\n👤 ${address}: Not registered`);
      }
      
    } catch (error) {
      console.log(`\n❌ ${address}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Tarama sonucu: ${stuckPlayers.length} sıkışan oyuncu bulundu`);
  
  if (stuckPlayers.length > 0) {
    console.log("\n🚨 SIKIŞAN OYUNCULAR:");
    stuckPlayers.forEach((stuck, i) => {
      console.log(`${i + 1}. ${stuck.address}`);
      console.log(`   Issues: ${stuck.issues.join(", ")}`);
      console.log(`   Lives: ${stuck.player.lives}, Active: ${stuck.player.isActive}, GameID: ${stuck.player.currentGameId}`);
    });
    
    console.log("\n💡 Kurtarma işlemi başlatılıyor...");
    return stuckPlayers;
  } else {
    console.log("🎉 Sıkışan oyuncu bulunamadı!");
    return [];
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });