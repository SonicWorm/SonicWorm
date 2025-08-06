const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  // Contract ABI - sadece ihtiyacımız olan function
  const resetAllABI = [
    {
      "inputs": [],
      "name": "adminEmergencyResetAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, resetAllABI, signer);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  try {
    console.log(`🔧 Resetting ALL players...`);
    const tx = await gameContract.adminEmergencyResetAll({
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('4', 'gwei')
    });
    
    console.log(`📝 Transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ SUCCESS: All players reset!`);
    
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
  }
  
  console.log("🎉 Reset completed!");
}

main().catch(console.error);