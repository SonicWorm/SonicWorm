const { ethers } = require("ethers");

async function main() {
  const serverPrivateKey = "0x685dce755cbcfbe1443e46573759841de82339dbae2c016b35446a174252a9bc";
  
  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const signer = new ethers.Wallet(serverPrivateKey, provider);
  
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