const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const abi = require('./artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
const contract = new ethers.Contract(process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET, abi, wallet);

async function resetMyStatus() {
  try {
    const myAddress = wallet.address;
    console.log(`🔄 Checking status for: ${myAddress}`);
    
    // Önce durumu kontrol et
    const playerData = await contract.getPlayer(myAddress);
    const isActive = playerData[6]; // isActive field
    const gameId = playerData[8]; // currentGameId field
    const lives = playerData[0]; // lives field
    
    console.log(`Current status: Active=${isActive}, GameId=${gameId}, Lives=${lives}`);
    
    if (!isActive) {
      console.log('✅ Player is not stuck, no reset needed');
      return;
    }
    
    console.log('🚨 Player is stuck, performing emergency reset...');
    
    // emergencyResetMyStatus() çağır
    const tx = await contract.emergencyResetMyStatus({
      gasLimit: 200000
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Transaction'ı bekle
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Emergency reset successful!');
      
      // Yeni durumu kontrol et
      const newPlayerData = await contract.getPlayer(myAddress);
      const newIsActive = newPlayerData[6];
      const newLives = newPlayerData[0];
      
      console.log(`New status: Active=${newIsActive}, Lives=${newLives}`);
      
      if (!newIsActive) {
        console.log('🎉 Player successfully reset and ready to play!');
      } else {
        console.log('⚠️ Warning: Player still appears active after reset');
      }
      
    } else {
      console.log('❌ Emergency reset failed');
    }
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  }
}

resetMyStatus();