const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  const setServerABI = [
    {
      "inputs": [{"internalType": "address", "name": "_server", "type": "address"}],
      "name": "setServer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  // Admin wallet (owner) - bu adminEmergencyResetPlayer çağırabilir
  const adminPrivateKey = process.env.PRIVATE_KEY;
  // Server wallet - oyunu başlatır ama reset yetkisi yok
  const serverAddress = "0xc53f972dD63C0705948A605DB063c8731a7B4B91";
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
  const gameContract = new ethers.Contract(contractAddress, setServerABI, adminSigner);
  
  console.log(`📋 Contract: ${contractAddress}`);
  console.log(`👑 Admin wallet (owner): ${adminSigner.address}`);
  console.log(`🖥️  Server wallet: ${serverAddress}`);
  
  // ÇÖZÜM: Admin wallet'ını server olarak da set edelim
  // Böylece hem startMatch hem de adminEmergencyResetPlayer çağırabilir
  try {
    console.log("🔧 Setting admin as server address...");
    const tx = await gameContract.setServer(adminSigner.address, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('4', 'gwei')
    });
    
    console.log(`📝 Transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ SUCCESS: Admin is now server!`);
    console.log(`📝 Update Railway PRIVATE_KEY to: ${adminPrivateKey}`);
    
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
  }
}

main().catch(console.error);