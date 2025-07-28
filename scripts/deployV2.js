const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  console.log("🚀 Deploying SonicWormGameV2...");

  const provider = new ethers.JsonRpcProvider("https://rpc.blaze.soniclabs.com");
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "S");

  // Contract bytecode ve ABI (hardhat compile gerekli ama manuel yapalım)
  const fs = require('fs');
  const path = require('path');
  
  // Contract source'u oku
  const contractSource = fs.readFileSync('./contracts/GameLogicV2Simple.sol', 'utf8');
  
  // Solidity compiler import et
  const solc = require('solc');
  
  const input = {
    language: 'Solidity',
    sources: {
      'GameLogicV2Simple.sol': {
        content: contractSource
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };

  console.log("📦 Compiling contract...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach(error => {
      console.log(error.formattedMessage);
    });
    if (output.errors.some(error => error.severity === 'error')) {
      throw new Error("Compilation failed");
    }
  }

  const contract = output.contracts['GameLogicV2Simple.sol']['SonicWormGameV2Simple'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("📡 Deploying to Sonic Blaze Testnet...");
  
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const gameContract = await factory.deploy();
  
  console.log("⏳ Waiting for deployment...");
  await gameContract.waitForDeployment();
  
  const contractAddress = await gameContract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);

  // Setup contract
  console.log("\n🔧 Setting up contract...");
  
  console.log("Setting fund addresses...");
  const tx1 = await gameContract.setWeeklyRewardPool(deployer.address);
  await tx1.wait();
  
  const tx2 = await gameContract.setDeveloperFund(deployer.address);
  await tx2.wait();
  
  const tx3 = await gameContract.setLiquidityFund(deployer.address);
  await tx3.wait();
  
  console.log("Setting server address...");
  const tx4 = await gameContract.setServer(deployer.address);
  await tx4.wait();
  
  console.log("✅ Contract setup complete!");
  
  console.log("\n📋 Deployment Summary:");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Sonic Blaze Testnet");
  console.log("Owner:", deployer.address);
  console.log("Life Price:", ethers.formatEther(await gameContract.lifePrice()), "S");
  
  console.log("\n🔄 Update your .env file:");
  console.log(`VITE_GAME_CONTRACT_ADDRESS_TESTNET=${contractAddress}`);
  
  // ABI'yi kaydet
  fs.writeFileSync('./contracts/GameLogicV2.abi.json', JSON.stringify(abi, null, 2));
  console.log("✅ ABI saved to contracts/GameLogicV2.abi.json");
}

main().catch(console.error);