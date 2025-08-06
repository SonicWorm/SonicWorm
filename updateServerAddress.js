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
  const newServerAddress = "0xc53f972dD63C0705948A605DB063c8731a7B4B91";
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const adminSigner = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // Admin wallet ile değiştir
  const gameContract = new ethers.Contract(contractAddress, setServerABI, adminSigner);
  
  console.log(`📋 Contract: ${contractAddress}`);
  console.log(`🔑 Admin wallet: ${adminSigner.address}`);
  console.log(`🖥️  New server address: ${newServerAddress}`);
  
  try {
    console.log("🔧 Updating server address...");
    const tx = await gameContract.setServer(newServerAddress, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('4', 'gwei')
    });
    
    console.log(`📝 Transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ SUCCESS: Server address updated!`);
    
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
  }
}

main().catch(console.error);