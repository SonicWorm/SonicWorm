const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("💰 Contract'a Küçük Fon Ekleme...");
  
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // Contract balance kontrol et
  const contractBalance = await provider.getBalance(contractAddress);
  console.log(`📊 Mevcut contract balance: ${ethers.formatEther(contractBalance)} S`);
  
  // Admin balance kontrol et
  const adminBalance = await provider.getBalance(signer.address);
  console.log(`📊 Admin balance: ${ethers.formatEther(adminBalance)} S`);
  
  // 15 S fon ekle (mevcut balansdan az)
  const fundAmount = ethers.parseEther("15.0");
  console.log(`\n💸 ${ethers.formatEther(fundAmount)} S ekleniyor...`);
  
  try {
    const tx = await signer.sendTransaction({
      to: contractAddress,
      value: fundAmount,
      gasLimit: 100000,
      gasPrice: ethers.parseUnits("1", "gwei")
    });
    
    console.log(`📝 Transaction: ${tx.hash}`);
    console.log("⏳ Onay bekleniyor...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Fon başarıyla eklendi!");
      
      // Yeni balance kontrol et
      const newBalance = await provider.getBalance(contractAddress);
      console.log(`📊 Yeni contract balance: ${ethers.formatEther(newBalance)} S`);
      
    } else {
      console.log("❌ Transaction başarısız!");
    }
    
  } catch (error) {
    console.error("❌ Fon ekleme hatası:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script hatası:", error);
    process.exit(1);
  });