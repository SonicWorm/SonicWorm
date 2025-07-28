const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔧 Contract'ta Server Adresini Ayarlama...");
  
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Owner: ${signer.address}`);
  
  // Mevcut server adresini kontrol et
  try {
    const currentServer = await gameContract.server();
    console.log(`📊 Mevcut server adresi: ${currentServer}`);
    
    // Server adresini set et (admin adresi ile aynı yapıyoruz)
    const serverAddress = signer.address; // Admin = Server
    
    if (currentServer.toLowerCase() === serverAddress.toLowerCase()) {
      console.log("✅ Server adresi zaten doğru ayarlanmış!");
      return;
    }
    
    console.log(`\n🔄 Server adresini ayarlıyor: ${serverAddress}`);
    
    const tx = await gameContract.setServer(serverAddress, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits("2", "gwei")
    });
    
    console.log(`📝 Transaction: ${tx.hash}`);
    console.log("⏳ Onay bekleniyor...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Server adresi başarıyla ayarlandı!");
      
      // Kontrol et
      const newServer = await gameContract.server();
      console.log(`📊 Yeni server adresi: ${newServer}`);
      
      if (newServer.toLowerCase() === serverAddress.toLowerCase()) {
        console.log("🎉 Server adresi doğru ayarlandı!");
      } else {
        console.log("❌ Server adresi ayarlanamadı!");
      }
      
    } else {
      console.log("❌ Transaction başarısız!");
    }
    
  } catch (error) {
    console.error("❌ Hata:", error.message);
    
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("💡 Sadece owner bu işlemi yapabilir!");
    }
  }
  
  console.log("\n💡 Şimdi server restart edin ve tekrar test edin.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });