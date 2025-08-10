const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const abi = require('./artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
// SENİN CONTRACT ADRESİN
const contractAddress = '0x8Ea91E76F41a708AC9fdB6D88e5C0d24d8beC810';
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function emergencyResetStuckPlayers() {
  try {
    console.log('🚨 ADMIN EMERGENCY RESET - Yeni contract ile tüm stuck oyuncuları sıfırlıyorum...');
    console.log(`📍 Contract Address: ${contractAddress}`);
    
    // Önce tüm stuck oyuncuları kontrol et
    console.log('\n🔍 Checking all players for stuck states...');
    
    const totalPlayers = await contract.getPlayerCount();
    console.log(`Total players in new contract: ${totalPlayers}`);
    
    if (totalPlayers == 0) {
      console.log('✅ NEW CONTRACT: No players found - all clean!');
      console.log('🎯 Old stuck players are now reset by using new contract');
      return;
    }
    
    const stuckPlayers = [];
    
    for (let i = 0; i < totalPlayers; i++) {
      try {
        const playerAddress = await contract.getPlayerAddressByIndex(i);
        const playerData = await contract.getPlayer(playerAddress);
        
        // isActive = true olanları bul
        if (playerData[6]) { // isActive field
          console.log(`STUCK PLAYER: ${playerAddress} (gameId: ${playerData[8]})`);
          stuckPlayers.push(playerAddress);
        }
      } catch (e) {
        console.log(`Could not check player at index ${i}`);
      }
    }
    
    if (stuckPlayers.length === 0) {
      console.log('✅ No stuck players found in new contract!');
      return;
    }
    
    console.log(`\n🚨 Found ${stuckPlayers.length} stuck players - Using ADMIN RESET`);
    
    // Admin reset all stuck players
    console.log('🔄 Executing adminEmergencyResetAll()...');
    
    const tx = await contract.adminEmergencyResetAll({
      gasLimit: 500000
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ ADMIN RESET SUCCESSFUL!');
      
      // Verify all players are now reset
      console.log('\n🔍 Verifying all players are now reset...');
      
      for (const playerAddress of stuckPlayers) {
        try {
          const playerData = await contract.getPlayer(playerAddress);
          const isActive = playerData[6];
          
          if (isActive) {
            console.log(`⚠️ WARNING: Player ${playerAddress} is still active!`);
          } else {
            console.log(`✅ VERIFIED: Player ${playerAddress} successfully reset`);
          }
        } catch (e) {
          console.log(`❓ Could not verify player ${playerAddress}`);
        }
      }
      
      console.log('\n🎉 ALL STUCK PLAYERS HAVE BEEN RESET!');
      console.log('🎮 Game is now ready for clean multiplayer testing');
      
    } else {
      console.log('❌ Admin reset failed');
    }
    
  } catch (error) {
    console.error('❌ Admin reset failed:', error.message);
  }
}

emergencyResetStuckPlayers();