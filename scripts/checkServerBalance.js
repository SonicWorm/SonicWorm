const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(signer.address);
  
  console.log(`🔑 Server wallet: ${signer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} S`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("🚨 WARNING: Low balance! Need more testnet tokens.");
    console.log("💡 Send some testnet S to server wallet.");
  } else {
    console.log("✅ Sufficient balance for transactions.");
  }
}

main().catch(console.error);