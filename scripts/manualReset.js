const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  const gameLogicAbi = require('../artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;
  const contractAddress = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET;
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gameContract = new ethers.Contract(contractAddress, gameLogicAbi, signer);
  
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`🔑 Admin: ${signer.address}`);
  
  // İki sıkışan oyuncuyu reset et
  const stuckPlayers = [
    "0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629", 
    "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3"
  ];
  
  for (const playerAddress of stuckPlayers) {
    try {
      console.log(`🔧 Resetting: ${playerAddress}`);
      const tx = await gameContract.adminEmergencyResetPlayer(playerAddress, {
        gasLimit: 200000,
        gasPrice: ethers.parseUnits('4', 'gwei')
      });
      
      console.log(`📝 Transaction: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ SUCCESS: ${playerAddress} reset!`);
      
    } catch (error) {
      console.error(`❌ FAILED: ${playerAddress} - ${error.message}`);
    }
  }
  
  console.log("🎉 Manual reset completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});