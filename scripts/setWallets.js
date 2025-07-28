const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("💰 4 Cüzdan Sistemi Ayarlama İşlemi Başlıyor...");
  
  // Kontrat bağlantısı
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Kontrat bağlandı: ${contractAddress}`);
  console.log(`🔑 Admin address: ${signer.address}`);
  
  // 4 Cüzdan Adresleri
  const walletAddresses = {
    prizePoolWallet: "0x4b1178b379c8E059e3EFFe3ca3A00310050e8fB4",      // %60 = 3 S
    weeklyRewardPool: "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3",     // %20 = 1 S
    developerFund: "0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629",        // %15 = 0.75 S
    liquidityFund: "0x3F0b441FFAeDaB9cdb25e0953a5e6c9779f8F81D"         // %5 = 0.25 S
  };
  
  console.log("\n📋 Ayarlanacak Cüzdan Adresleri:");
  console.log(`🏆 Prize Pool Wallet (60%): ${walletAddresses.prizePoolWallet}`);
  console.log(`📅 Weekly Reward Pool (20%): ${walletAddresses.weeklyRewardPool}`);
  console.log(`👨‍💻 Developer Fund (15%): ${walletAddresses.developerFund}`);
  console.log(`💧 Liquidity Fund (5%): ${walletAddresses.liquidityFund}`);
  
  try {
    // 1. Prize Pool Wallet ayarla (%60)
    console.log("\n🏆 Prize Pool Wallet ayarlanıyor...");
    const tx1 = await gameContract.setPrizePoolWallet(walletAddresses.prizePoolWallet, {
      gasLimit: 100000
    });
    console.log(`   📝 Transaction: ${tx1.hash}`);
    await tx1.wait();
    console.log(`   ✅ Prize Pool Wallet ayarlandı!`);
    
    // 2. Weekly Reward Pool ayarla (%20)
    console.log("\n📅 Weekly Reward Pool ayarlanıyor...");
    const tx2 = await gameContract.setWeeklyRewardPool(walletAddresses.weeklyRewardPool, {
      gasLimit: 100000
    });
    console.log(`   📝 Transaction: ${tx2.hash}`);
    await tx2.wait();
    console.log(`   ✅ Weekly Reward Pool ayarlandı!`);
    
    // 3. Developer Fund ayarla (%15)
    console.log("\n👨‍💻 Developer Fund ayarlanıyor...");
    const tx3 = await gameContract.setDeveloperFund(walletAddresses.developerFund, {
      gasLimit: 100000
    });
    console.log(`   📝 Transaction: ${tx3.hash}`);
    await tx3.wait();
    console.log(`   ✅ Developer Fund ayarlandı!`);
    
    // 4. Liquidity Fund ayarla (%5)
    console.log("\n💧 Liquidity Fund ayarlanıyor...");
    const tx4 = await gameContract.setLiquidityFund(walletAddresses.liquidityFund, {
      gasLimit: 100000
    });
    console.log(`   📝 Transaction: ${tx4.hash}`);
    await tx4.wait();
    console.log(`   ✅ Liquidity Fund ayarlandı!`);
    
    console.log("\n🎉 Tüm cüzdanlar başarıyla ayarlandı!");
    
    // Kontrol: Ayarlanan adresleri doğrula
    console.log("\n🔍 Kontrol ediliyor...");
    const setPrizePool = await gameContract.prizePoolWallet();
    const setWeekly = await gameContract.weeklyRewardPool();
    const setDeveloper = await gameContract.developerFund();
    const setLiquidity = await gameContract.liquidityFund();
    
    console.log(`✅ Prize Pool Wallet: ${setPrizePool}`);
    console.log(`✅ Weekly Reward Pool: ${setWeekly}`);
    console.log(`✅ Developer Fund: ${setDeveloper}`);
    console.log(`✅ Liquidity Fund: ${setLiquidity}`);
    
    // Verification
    const allCorrect = 
      setPrizePool.toLowerCase() === walletAddresses.prizePoolWallet.toLowerCase() &&
      setWeekly.toLowerCase() === walletAddresses.weeklyRewardPool.toLowerCase() &&
      setDeveloper.toLowerCase() === walletAddresses.developerFund.toLowerCase() &&
      setLiquidity.toLowerCase() === walletAddresses.liquidityFund.toLowerCase();
    
    if (allCorrect) {
      console.log("\n🎯 Tüm cüzdanlar doğru şekilde ayarlandı!");
      console.log("\n💡 Artık oyuncular 5 S ödediklerinde:");
      console.log("   🏆 3 S → Prize Pool'a gider");
      console.log("   📅 1 S → Weekly Reward'a gider");
      console.log("   👨‍💻 0.75 S → Developer Fund'a gider");
      console.log("   💧 0.25 S → Liquidity Fund'a gider");
    } else {
      console.log("\n⚠️ Bazı adresler yanlış ayarlanmış olabilir!");
    }
    
  } catch (error) {
    console.error("\n❌ Cüzdan ayarlama hatası:", error.message);
    
    if (error.reason) {
      console.error(`💡 Hata sebebi: ${error.reason}`);
    }
    
    if (error.message.includes("Only owner")) {
      console.error("🔒 Bu işlem sadece contract owner tarafından yapılabilir!");
      console.error(`📋 Contract owner kontrolü gerekli.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });