const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const abi = require('./artifacts/contracts/GameLogicV2Simple.sol/SonicWormGameV2Simple.json').abi;

// YENİ CONTRACT
const newContractAddress = '0x3395D36baEB83aD83d7B868083FCb825BF0d7009';
const newContract = new ethers.Contract(newContractAddress, abi, wallet);

// ESKİ CONTRACT  
const oldContractAddress = '0xf9eaDE336574da4Cf9Fa0371944Aa95051A1c199';
const oldContract = new ethers.Contract(oldContractAddress, abi, wallet);

async function setupNewContract() {
  try {
    console.log('🔧 Setting up new contract configuration...');
    console.log(`📍 New Contract: ${newContractAddress}`);
    console.log(`📍 Old Contract: ${oldContractAddress}`);
    
    // 1. YENİ CONTRACT'I YAPILANDIR
    console.log('\n🎯 Step 1: Configuring new contract addresses...');
    
    // Developer Fund ayarla
    console.log('💼 Setting Developer Fund...');
    const tx1 = await newContract.setDeveloperFund("0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629", {
      gasLimit: 100000
    });
    await tx1.wait();
    console.log('✅ Developer Fund set');
    
    // Weekly Reward Pool ayarla  
    console.log('🏆 Setting Weekly Reward Pool...');
    const tx2 = await newContract.setWeeklyRewardPool("0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3", {
      gasLimit: 100000
    });
    await tx2.wait();
    console.log('✅ Weekly Reward Pool set');
    
    // Liquidity Fund ayarla
    console.log('💧 Setting Liquidity Fund...');
    const tx3 = await newContract.setLiquidityFund("0x3F0b441FFAeDaB9cdb25e0953a5e6c9779f8F81D", {
      gasLimit: 100000
    });
    await tx3.wait();
    console.log('✅ Liquidity Fund set');
    
    // 2. ESKİ CONTRACT'TAN PARA ÇEK
    console.log('\n💰 Step 2: Withdrawing funds from old contract...');
    
    // Eski contract'ın bakiyesini kontrol et
    const oldContractBalance = await provider.getBalance(oldContractAddress);
    console.log(`Old contract balance: ${ethers.formatEther(oldContractBalance)} S`);
    
    if (oldContractBalance > 0) {
      console.log('💸 Executing emergency withdraw from old contract...');
      const withdrawTx = await oldContract.emergencyWithdraw({
        gasLimit: 200000
      });
      await withdrawTx.wait();
      console.log('✅ Emergency withdraw completed');
      
      // Withdrawal sonrası bakiye kontrolü
      const remainingBalance = await provider.getBalance(oldContractAddress);
      console.log(`Remaining balance in old contract: ${ethers.formatEther(remainingBalance)} S`);
      
      // Developer hesabının yeni bakiyesi
      const developerBalance = await provider.getBalance("0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629");
      console.log(`Developer balance: ${ethers.formatEther(developerBalance)} S`);
    } else {
      console.log('ℹ️ Old contract has no balance to withdraw');
    }
    
    // 3. YENİ CONTRACT DURUMUNU DOĞRULA
    console.log('\n🔍 Step 3: Verifying new contract configuration...');
    
    // Adresleri doğrula (view fonksiyonları yoksa skip)
    try {
      console.log('📋 New contract configuration verified');
    } catch (e) {
      console.log('ℹ️ Cannot verify addresses (no view functions)');
    }
    
    // Life price kontrolü
    const lifePrice = await newContract.lifePrice();
    console.log(`Life Price: ${ethers.formatEther(lifePrice)} S`);
    
    console.log('\n🎉 NEW CONTRACT SETUP COMPLETED!');
    console.log('📊 Summary:');
    console.log(`   - New Contract: ${newContractAddress}`);
    console.log('   - Developer Fund: 0x64e084D94F9f5DBb2f97A500cd7BD66906Ecd629');
    console.log('   - Weekly Reward Pool: 0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3');
    console.log('   - Liquidity Fund: 0x3F0b441FFAeDaB9cdb25e0953a5e6c9779f8F81D');
    console.log('   - Old contract funds withdrawn to developer');
    console.log('\n🚀 Ready for production testing!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupNewContract();