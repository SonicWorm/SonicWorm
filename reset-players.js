const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const abi = require('./artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
const contract = new ethers.Contract(process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET, abi, wallet);

async function findStuckPlayers() {
  try {
    console.log('Checking all players for stuck states...');
    
    const totalPlayers = await contract.getPlayerCount();
    console.log(`Total players in contract: ${totalPlayers}`);
    
    const stuckPlayers = [];
    
    for (let i = 0; i < totalPlayers; i++) {
      try {
        const playerAddress = await contract.getPlayerAddressByIndex(i);
        const playerData = await contract.getPlayer(playerAddress);
        
        // isActive = true olanları bul
        if (playerData[6]) { // isActive field
          console.log(`STUCK PLAYER: ${playerAddress} (gameId: ${playerData[8]})`);
          stuckPlayers.push({
            address: playerAddress,
            gameId: playerData[8].toString(),
            lives: playerData[0].toString()
          });
        }
      } catch (e) {
        console.log(`Could not check player at index ${i}`);
      }
    }
    
    if (stuckPlayers.length === 0) {
      console.log('No stuck players found!');
      return;
    }
    
    console.log(`\nFound ${stuckPlayers.length} stuck players:`);
    stuckPlayers.forEach(p => {
      console.log(`  - ${p.address} (gameId: ${p.gameId}, lives: ${p.lives})`);
    });
    
    console.log('\nThese players need to call emergencyResetMyStatus() from their own wallets.');
    
  } catch (error) {
    console.error('Check failed:', error.message);
  }
}

findStuckPlayers();