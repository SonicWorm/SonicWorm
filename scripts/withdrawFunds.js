const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  console.log("💰 Withdrawing funds from old contract...");

  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const ownerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const gameLogicAbi = [
    "function emergencyWithdraw() external",
    "function owner() external view returns (address)"
  ];
  
  const contract = new ethers.Contract(
    process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET,
    gameLogicAbi,
    ownerWallet
  );

  // Contract owner kontrolü
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  console.log("Your address:", ownerWallet.address);
  
  if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
    console.log("❌ You are not the contract owner!");
    return;
  }

  // Contract bakiyesi
  const contractBalance = await provider.getBalance(process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET);
  console.log("Contract balance:", ethers.formatEther(contractBalance), "S");
  
  if (contractBalance > 0) {
    console.log("🔄 Withdrawing all funds...");
    const tx = await contract.emergencyWithdraw();
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ All funds withdrawn successfully!");
    
    // Yeni bakiye
    const newBalance = await provider.getBalance(process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET);
    console.log("New contract balance:", ethers.formatEther(newBalance), "S");
  } else {
    console.log("ℹ️ Contract has no funds to withdraw");
  }
}

main().catch(console.error);