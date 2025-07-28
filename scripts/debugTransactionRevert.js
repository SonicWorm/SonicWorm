const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Blockchain Transaction Revert Debug...");
  
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // Log'dan gelen oyuncular
  const players = [
    "0x85146539B8b2aE8B37C1DB66D36ab45EF3657FB8",
    "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3"
  ];
  
  console.log("\n🔍 Oyuncu durumlarını kontrol ediliyor...");
  
  for (const playerAddress of players) {
    console.log(`\n👤 ${playerAddress}:`);
    
    try {
      const player = await gameContract.players(playerAddress);
      console.log(`   Lives: ${player.lives}`);
      console.log(`   Is Active: ${player.isActive}`);
      console.log(`   Current Game ID: ${player.currentGameId}`);
      console.log(`   Is Registered: ${player.isRegistered}`);
      console.log(`   Total Games: ${player.totalGamesPlayed}`);
      
      // Game durumunu kontrol et
      if (player.currentGameId > 0) {
        try {
          const game = await gameContract.games(player.currentGameId);
          console.log(`   Game ${player.currentGameId}:`);
          console.log(`     Reserved: ${game.isReserved}`);
          console.log(`     Completed: ${game.isCompleted}`);
          console.log(`     Life Consumed: ${game.lifeConsumed}`);
          console.log(`     Start Time: ${game.startTime}`);
          console.log(`     End Time: ${game.endTime}`);
          console.log(`     Player Count: ${game.playerCount}`);
          
          // Potansiyel sorunları kontrol et
          if (game.isReserved && !game.lifeConsumed) {
            console.log(`   ⚠️ SORUN: Game rezerve edilmiş ama life consumed değil`);
          }
          if (game.lifeConsumed && !game.isCompleted) {
            console.log(`   ⚠️ SORUN: Life consumed ama game completed değil`);
          }
          if (player.isActive && player.lives <= 0) {
            console.log(`   ⚠️ SORUN: Oyuncu aktif ama can yok`);
          }
          
        } catch (e) {
          console.log(`   ❌ Game ${player.currentGameId} bilgisi alınamadı: ${e.message}`);
        }
      }
      
      // Balance kontrolü
      const balance = await provider.getBalance(playerAddress);
      console.log(`   Balance: ${ethers.formatEther(balance)} S`);
      
    } catch (error) {
      console.log(`   ❌ Oyuncu bilgisi alınamadı: ${error.message}`);
    }
  }
  
  // Contract genel durumu
  console.log("\n📊 Contract genel durumu:");
  try {
    const totalPlayers = await gameContract.totalPlayers();
    const nextGameId = await gameContract.nextGameId();
    const adminBalance = await provider.getBalance(signer.address);
    
    console.log(`   Total Players: ${totalPlayers}`);
    console.log(`   Next Game ID: ${nextGameId}`);
    console.log(`   Admin Balance: ${ethers.formatEther(adminBalance)} S`);
    
    // Contract balance
    const contractBalance = await provider.getBalance(contractAddress);
    console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} S`);
    
  } catch (error) {
    console.log(`   ❌ Contract durumu alınamadı: ${error.message}`);
  }
  
  // StartMatch fonksiyonunu test et (dry run)
  console.log("\n🧪 StartMatch test (dry run):");
  try {
    // Gas estimate yap
    const gasEstimate = await gameContract.startMatch.estimateGas(
      [players[0], players[1]], 
      [4, 5]
    );
    console.log(`   ✅ Gas estimate başarılı: ${gasEstimate}`);
    
    // Call ile test et (transaction göndermeden)
    const result = await gameContract.startMatch.staticCall(
      [players[0], players[1]], 
      [4, 5]
    );
    console.log(`   ✅ Static call başarılı`);
    
  } catch (error) {
    console.log(`   ❌ StartMatch test başarısız: ${error.message}`);
    
    // Hata sebebini analiz et
    if (error.message.includes("Player is not registered")) {
      console.log(`   💡 Sebep: Oyuncu kayıtlı değil`);
    } else if (error.message.includes("Player does not have enough lives")) {
      console.log(`   💡 Sebep: Oyuncu yeterli can yok`);
    } else if (error.message.includes("Player is already active")) {
      console.log(`   💡 Sebep: Oyuncu zaten aktif`);
    } else if (error.message.includes("Game already exists")) {
      console.log(`   💡 Sebep: Game zaten var`);
    } else if (error.message.includes("Insufficient payment")) {
      console.log(`   💡 Sebep: Yetersiz ödeme`);
    }
  }
  
  console.log("\n💡 Öneriler:");
  console.log("1. Eğer oyuncular aktif ise önce reset edin");
  console.log("2. Game ID'leri çakışıyor olabilir - yeni ID'ler deneyin");
  console.log("3. Oyuncular yeterli balance'a sahip mi kontrol edin");
  console.log("4. Contract'ta entry fee ayarı kontrol edin");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });