const { ethers } = require("ethers");

const serverPrivateKey = "0x685dce755cbcfbe1443e46573759841de82339dbae2c016b35446a174252a9bc";
const wallet = new ethers.Wallet(serverPrivateKey);

console.log(`🔑 Server Private Key: ${serverPrivateKey}`);
console.log(`📍 Server Wallet Address: ${wallet.address}`);