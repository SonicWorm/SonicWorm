// ESM rescue script for ethers v6
// Usage (PowerShell):
//   $env:PRIVATE_KEY="0x..."; $env:VITE_GAME_CONTRACT_ADDRESS_TESTNET="0x..."; $env:RPC_URL="https://rpc.blaze.soniclabs.com"; node scripts/rescue-stuck-players.mjs

import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'https://rpc.blaze.soniclabs.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET || process.env.CONTRACT_ADDRESS;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY is not set.');
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error('❌ Contract address is not set. Use VITE_GAME_CONTRACT_ADDRESS_TESTNET or CONTRACT_ADDRESS');
  process.exit(1);
}

// Minimal ABI
const ABI = [
  {
    inputs: [],
    name: 'getPlayerCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getPlayerAddressByIndex',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayer',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'lives', type: 'uint256' },
          { internalType: 'uint256', name: 'totalGamesPlayed', type: 'uint256' },
          { internalType: 'uint256', name: 'totalKills', type: 'uint256' },
          { internalType: 'uint256', name: 'totalSurvivalTime', type: 'uint256' },
          { internalType: 'uint256', name: 'totalRewards', type: 'uint256' },
          { internalType: 'uint256', name: 'lastLifeRefill', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
          { internalType: 'bool', name: 'isRegistered', type: 'bool' },
          { internalType: 'uint256', name: 'currentGameId', type: 'uint256' }
        ],
        internalType: 'struct SonicWormGameV2Simple.Player',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'adminEmergencyResetAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'playerAddress', type: 'address' }],
    name: 'adminEmergencyResetPlayer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  console.log('🚨 ADMIN RESCUE: Reset stuck players');
  console.log(`📍 RPC: ${RPC_URL}`);
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🔑 Admin: ${signer.address}`);

  const totalPlayers = Number(await contract.getPlayerCount());
  console.log(`👥 Total players: ${totalPlayers}`);

  const stuckPlayers = [];
  for (let i = 0; i < totalPlayers; i++) {
    try {
      const addr = await contract.getPlayerAddressByIndex(i);
      const p = await contract.getPlayer(addr);
      const isActive = Boolean(p[6]);
      if (isActive) {
        console.log(`STUCK: ${addr} (gameId: ${p[8]})`);
        stuckPlayers.push(addr);
      }
    } catch (e) {
      console.log(`Skip index ${i}`);
    }
  }

  if (stuckPlayers.length === 0) {
    console.log('✅ No stuck players found');
    return;
  }

  // Try bulk reset first
  try {
    console.log('🔄 Calling adminEmergencyResetAll() ...');
    const tx = await contract.adminEmergencyResetAll({ gasLimit: 500000 });
    console.log(`📝 TX: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log('📥 Status:', receipt.status);
    if (receipt.status !== 1n && receipt.status !== 1) throw new Error('Bulk reset failed');
  } catch (e) {
    console.log('⚠️ Bulk reset failed, trying per-player fallback...');
    for (const addr of stuckPlayers) {
      try {
        const tx = await contract.adminEmergencyResetPlayer(addr, { gasLimit: 250000 });
        console.log(`📝 Reset ${addr}: ${tx.hash}`);
        await tx.wait();
      } catch (err) {
        console.log(`❌ Failed to reset ${addr}: ${err?.message || err}`);
      }
    }
  }

  // Verify
  console.log('🔍 Verifying players...');
  for (const addr of stuckPlayers) {
    try {
      const p = await contract.getPlayer(addr);
      console.log(`${addr} -> isActive=${Boolean(p[6])}`);
    } catch {}
  }

  console.log('🎉 Rescue complete');
}

main().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});


