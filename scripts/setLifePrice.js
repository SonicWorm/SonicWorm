const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  console.log("🔧 Resetting life price back to 5 S...");

  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const serverWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const gameLogicAbi = [
    "function setLifePrice(uint256 newPrice) external",
    "function lifePrice() external view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(
    process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET,
    gameLogicAbi,
    serverWallet
  );

  console.log("Current life price:", ethers.formatEther(await contract.lifePrice()), "S");
  
  // Set life price back to normal 5 S
  const tx = await contract.setLifePrice(ethers.parseEther("5"));
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  
  console.log("✅ Life price restored to:", ethers.formatEther(await contract.lifePrice()), "S");
  console.log("🎮 Life price is back to normal (5 S per life)!");
}

main().catch(console.error);