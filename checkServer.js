const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  const serverABI = [
    {
      "inputs": [],
      "name": "server",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, serverABI, signer);
  
  console.log(`📋 Contract: ${contractAddress}`);
  console.log(`🔑 Local wallet: ${signer.address}`);
  
  const serverAddress = await gameContract.server();
  console.log(`🖥️  Contract server address: ${serverAddress}`);
  
  if (serverAddress.toLowerCase() === signer.address.toLowerCase()) {
    console.log("✅ MATCH: Local wallet matches contract server");
  } else {
    console.log("❌ MISMATCH: Different addresses!");
    console.log("🔧 Need to update contract server address");
  }
}

main().catch(console.error);