const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const abi = require('./artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
const contract = new ethers.Contract(process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET, abi, wallet);

async function setServerAddress() {
  try {
    console.log('🔧 Setting server address in contract...');
    console.log(`📍 Contract: ${process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET}`);
    console.log(`🖥️ Server address: ${wallet.address}`);
    
    // Contract'ta server adresini ayarla
    const tx = await contract.setServer(wallet.address, {
      gasLimit: 100000
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Server address set successfully!');
      console.log('🎮 Server can now call blockchain functions');
    } else {
      console.log('❌ Failed to set server address');
    }
    
  } catch (error) {
    console.error('❌ Failed to set server address:', error.message);
  }
}

setServerAddress();