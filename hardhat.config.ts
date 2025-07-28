import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

// --- YENİ KONTROL BLOĞU ---
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Lütfen .env dosyasında PRIVATE_KEY değişkenini tanımlayın.");
}
// -------------------------

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "sonic-testnet": {
      url: "https://rpc.blaze.soniclabs.com",
      chainId: 57054,
      accounts: [privateKey],
      gasPrice: 20000000000, // 20 gwei
    },
    "sonic-mainnet": {
      url: "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: [privateKey],
      gasPrice: 1000000000, // 1 gwei
    },
  },
  etherscan: {
    apiKey: {
      "sonic-testnet": process.env.SONIC_API_KEY || "",
      "sonic-mainnet": process.env.SONIC_API_KEY || "",
    },
    customChains: [
      {
        network: "sonic-testnet",
        chainId: 64165,
        urls: {
          apiURL: "https://api.testnet.soniclabs.com/api",
          browserURL: "https://explorer.testnet.soniclabs.com",
        },
      },
      {
        network: "sonic-mainnet",
        chainId: 146,
        urls: {
          apiURL: "https://api.soniclabs.com/api",
          browserURL: "https://explorer.soniclabs.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;