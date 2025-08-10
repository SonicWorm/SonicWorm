/// <reference types="vite/client" />
// SENİN KURALLARIN: Web3 Blockchain Service
import { ethers } from 'ethers';

// Sonic Network Configuration
const SONIC_NETWORKS = {
  testnet: {
    chainId: 57054,
    chainName: 'Sonic Blaze Testnet',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.blaze.soniclabs.com'],
    blockExplorerUrls: ['https://testnet.sonicscan.org'],
  },
  mainnet: {
    chainId: 146,
    chainName: 'Sonic Mainnet',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.soniclabs.com'],
    blockExplorerUrls: ['https://explorer.soniclabs.com'],
  }
};

// SonicWormGameV2Simple Contract ABI
const GAME_LOGIC_ABI = [
  "function buyLives(uint256 amount) external payable",
  "function reserveGame() external returns (uint256)",
  "function endGame(uint256 gameId) external",
  "function cancelReservedGame(uint256 gameId) external",
  "function recordKill(uint256 gameId, address victimAddress) external",
  "function emergencyResetMyStatus() external",
  "function adminEmergencyResetAll() external",
  "function batchResetPlayers(address[] calldata playerAddresses) external",
  "function getPlayer(address playerAddress) external view returns (tuple(uint256 lives, uint256 totalGamesPlayed, uint256 totalKills, uint256 totalSurvivalTime, uint256 totalRewards, uint256 lastLifeRefill, bool isActive, bool isRegistered, uint256 currentGameId))",
  "function getGame(uint256 gameId) external view returns (tuple(address player, uint256 startTime, uint256 endTime, uint256 kills, uint256 survivalTime, bool earnedReward, bool isCompleted, bool rewardClaimed, bool lifeConsumed, bool isReserved))",
  "function lifePrice() external view returns (uint256)",
  "function getPlayerCount() external view returns (uint256)",
  "function getPlayerAddressByIndex(uint256 index) external view returns (address)",
  "function startMatch(address[] calldata _players, uint256[] calldata _gameIds) external",
  "function rewardPool() external view returns (uint256)",
  "function getPendingRewards(address playerAddress) external view returns (uint256)",
  "function claimRewards() external",
  "function distributePrizes(address[] calldata winners, uint256[] calldata amounts) external",
  "event GameReserved(address indexed player, uint256 gameId)",
  "event GameStarted(address indexed player, uint256 gameId)",
  "event GameEnded(address indexed player, uint256 gameId, uint256 kills, uint256 survivalTime, bool earnedReward)",
  "event LifePurchased(address indexed player, uint256 amount, uint256 cost)"
];

export interface PlayerStats {
  lives: number;
  totalGamesPlayed: number;
  totalKills: number;
  totalSurvivalTime: number;
  totalRewards: number;
  lastLifeRefill: number;
  isActive: boolean;
  isRegistered: boolean; // YENİ: Kayıt durumu
  currentGameId: number; // YENİ: Aktif oyun ID'si
  totalGamesWon: number; // eklendi
}

export interface GameTransaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'buyLives' | 'startGame' | 'endGame' | 'claimRewards';
  timestamp: number;
}

// Type declarations for Vite env and window.ethereum
// ImportMeta interface removed as it's built-in to modern TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private gameContract: ethers.Contract | null = null;
  private currentAccount: string | null = null;
  private currentNetwork: 'testnet' | 'mainnet' = 'testnet';
  private currentGameId: number | null = null;
  
  // Contract addresses (will be set after deployment)
  private contractAddresses = {
    testnet: import.meta.env.VITE_GAME_CONTRACT_ADDRESS_TESTNET || '',
    mainnet: import.meta.env.VITE_GAME_CONTRACT_ADDRESS_MAINNET || ''
  };

  // Event callbacks
  private onAccountChange: ((account: string | null) => void) | null = null;
  private onNetworkChange: ((network: string) => void) | null = null;
  private onTransactionUpdate: ((tx: GameTransaction) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  // Utility: Gas fiyatını otomatik hesapla
  private async getOptimizedGasOptions(baseGasLimit: number): Promise<any> {
    const txOptions: any = {
      gasLimit: Math.floor(baseGasLimit * 1.5) // %50 artır (1.2'den 1.5'e)
    };

    if (this.gameContract?.runner?.provider) {
      try {
        const feeData = await this.gameContract.runner.provider.getFeeData();
        // Gas fiyatını %100 artır (150'den 200'e)
        if (feeData.gasPrice) {
          txOptions.gasPrice = (feeData.gasPrice * 200n) / 100n;
          console.log('💰 Using optimized gas price:', txOptions.gasPrice.toString());
        }
      } catch (error) {
        console.log('⚠️ Could not optimize gas, using default');
      }
    }

    return txOptions;
  }

  constructor() {
    this.initializeEventListeners();
  }

  // Event listeners
  public setOnAccountChange(callback: (account: string | null) => void) {
    this.onAccountChange = callback;
  }

  public setOnNetworkChange(callback: (network: string) => void) {
    this.onNetworkChange = callback;
  }

  public setOnTransactionUpdate(callback: (tx: GameTransaction) => void) {
    this.onTransactionUpdate = callback;
  }

  public setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  private initializeEventListeners() {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Account change listener
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        const account = accounts.length > 0 ? accounts[0] : null;
        this.currentAccount = account;
        this.onAccountChange?.(account);
        
        if (account) {
          this.initializeContract();
        }
      });

      // Network change listener
      window.ethereum.on('chainChanged', (chainId: string) => {
        const networkId = parseInt(chainId, 16);
        const network = networkId === SONIC_NETWORKS.mainnet.chainId ? 'mainnet' : 'testnet';
        this.currentNetwork = network;
        this.onNetworkChange?.(network);
        this.initializeContract();
      });
    }
  }

  // SENİN KURALLARIN: Wallet bağlantısı
  public async connectWallet(onConnected?: () => void): Promise<string> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.currentAccount = accounts[0] as string;
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Check and switch to Sonic network
      await this.ensureSonicNetwork();
      
      // Initialize contract
      await this.initializeContract();

      console.log('🔗 Wallet connected:', this.currentAccount);

      // --- YENİ KISIM ---
      // Her şeyin hazır olduğunu dışarıya bildir
      if (onConnected) {
        console.log('✅ All setup complete, calling onConnected callback');
        onConnected();
      }
      // --- BİTTİ ---

      return this.currentAccount;

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      this.onError?.(error.message || 'Failed to connect wallet');
      throw error;
    }
  }

  // SENİN KURALLARIN: Sonic Network'e geçiş
  private async ensureSonicNetwork(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const network = SONIC_NETWORKS[this.currentNetwork];
    
    try {
      // Try to switch to Sonic network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Network not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.chainName,
                nativeCurrency: network.nativeCurrency,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Sonic network');
        }
      } else {
        throw switchError;
      }
    }
  }

  // Contract initialization
  private async initializeContract(): Promise<void> {
    console.log('🔧 Initializing contract...');
    console.log('🔧 Signer:', !!this.signer);
    console.log('🔧 Network:', this.currentNetwork);
    
    if (!this.signer) {
      console.log('❌ No signer available');
      return;
    }

    const contractAddress = this.contractAddresses[this.currentNetwork];
    console.log('🔧 Contract address:', contractAddress);
    
    if (!contractAddress) {
      console.warn(`❌ No contract address for ${this.currentNetwork}`);
      return;
    }

    try {
      this.gameContract = new ethers.Contract(
        contractAddress,
        GAME_LOGIC_ABI,
        this.signer
      );

      console.log(`✅ Game contract initialized on ${this.currentNetwork}`);
      console.log(`✅ Contract address: ${contractAddress}`);
      
      // Test contract connection
      try {
        const lifePrice = await this.gameContract.lifePrice();
        console.log(`✅ Contract test successful - Life price: ${ethers.formatEther(lifePrice)}`);
      } catch (testError) {
        console.error('❌ Contract test failed:', testError);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize contract:', error);
      this.onError?.('Failed to initialize game contract');
    }
  }

  // SENİN KURALLARIN: Can satın alma
  public async buyLives(amount: number): Promise<GameTransaction> {
    if (!this.gameContract || !this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get life price from contract
      const lifePrice = await this.gameContract.lifePrice();
      const totalCost = lifePrice * BigInt(amount);

      console.log(`💰 Buying ${amount} lives for ${ethers.formatEther(totalCost)} Sonic`);

      // Send transaction
      const tx = await this.gameContract.buyLives(amount, {
        value: totalCost,
        gasLimit: 300000 // 200,000'den 300,000'e artırıldı
      });

      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'buyLives',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log('✅ Lives purchased successfully');
      } else {
        throw new Error('Transaction failed');
      }

      return transaction;

    } catch (error: any) {
      console.error('Failed to buy lives:', error);
      this.onError?.(error.message || 'Failed to buy lives');
      throw error;
    }
  }

  // SENİN KURALLARIN: Oyun rezerve etme (can harcamadan)
  public async reserveGame(): Promise<{ gameId: number; transaction: GameTransaction }> {
    if (!this.gameContract || !this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🎯 Reserving game slot...');

      // Player durumunu kontrol et
      console.log('🔍 Checking player status...');
      const playerData = await this.gameContract.getPlayer(this.currentAccount);
      console.log('📊 Player data:', {
        lives: playerData.lives.toString(),
        isActive: playerData.isActive,
        totalGames: playerData.totalGamesPlayed.toString(),
        currentGameId: playerData.currentGameId.toString()
      });

      // Lives kontrolü
      if (playerData.lives <= 0) {
        throw new Error('You have no lives left! Please buy more lives first.');
      }

      // Active game kontrolü
      if (playerData.isActive) {
        console.log('⚠️ Player already has active/reserved game');
        throw new Error('You already have an active or reserved game. Please finish it first.');
      }

      // Token bakiye kontrolü - sadece transaction fee için
      const balance = await this.provider!.getBalance(this.currentAccount);
      const minimumGasFee = ethers.parseEther("0.001");
      
      console.log('💰 Balance check:', {
        balance: ethers.formatEther(balance),
        minimumRequired: ethers.formatEther(minimumGasFee),
        sufficient: balance >= minimumGasFee
      });

      if (balance < minimumGasFee) {
        throw new Error(`Insufficient balance for transaction fees! You need at least 0.001 S for gas.`);
      }

      // Gas seçenekleri
      const gasOptions = await this.getOptimizedGasOptions(250000); // 150,000'den 250,000'e artırıldı
      console.log('⛽ Gas options:', gasOptions);
      
      // YENİ: reserveGame çağır (can harcamadan)
      const tx = await this.gameContract.reserveGame(gasOptions);

      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'startGame', // UI için aynı tip kullan
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);

      // Wait for confirmation and get game ID
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Extract game ID from GameReserved event
      const gameReservedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.gameContract!.interface.parseLog(log);
          return parsed?.name === 'GameReserved';
        } catch {
          return false;
        }
      });

      if (gameReservedEvent) {
        const parsed = this.gameContract.interface.parseLog(gameReservedEvent);
        this.currentGameId = Number(parsed?.args[1]);
        console.log('✅ Game reserved with ID:', this.currentGameId);
      }

      return {
        gameId: this.currentGameId || 0,
        transaction
      };

    } catch (error: any) {
      console.error('Failed to start game:', error);
      
      // Specific error handling
      let errorMessage = 'Failed to start game';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('execution reverted')) {
        errorMessage = 'Transaction failed - possible reasons:\n• No lives remaining\n• Already have active game\n• Insufficient balance';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // SENİN KURALLARIN: Son GameStarted event'ini bul
  private async findLastGameId(): Promise<number | null> {
    if (!this.gameContract || !this.currentAccount) return null;

    try {
      console.log('🔍 Searching for last GameStarted event...');
      
      // Son 1000 blok içinde GameStarted eventlerini ara
      const currentBlock = await this.provider!.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      const filter = this.gameContract.filters.GameStarted(this.currentAccount);
      const events = await this.gameContract.queryFilter(filter, fromBlock, currentBlock);
      
      if (events.length > 0) {
        // En son eventi al
        const lastEvent = events[events.length - 1];
        const gameId = Number((lastEvent as any).args?.[1]);
        console.log(`🎯 Found last gameId: ${gameId}`);
        return gameId;
      }
      
      console.log('❌ No GameStarted events found');
      return null;
    } catch (error) {
      console.error('Failed to find last gameId:', error);
      return null;
    }
  }

  // SENİN KURALLARIN: Aktif oyunu zorla bitir (yeni yaklaşım)
  public async forceEndActiveGame(): Promise<GameTransaction> {
    if (!this.gameContract || !this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🛑 Force ending active game...');
      console.log('⚠️ Bu hesapta hiç oyun başlatılmamış ama isActive:true - kontrat hatalı durum!');

      // YÖNTEM 1: Emergency reset fonksiyonunu dene (yeni eklenen)
      try {
        console.log('🔄 Trying emergency function: emergencyResetMyStatus');
        const gasOptions = await this.getOptimizedGasOptions(150000);
        const tx = await this.gameContract.emergencyResetMyStatus(gasOptions);
        
        const transaction: GameTransaction = {
          hash: tx.hash,
          status: 'pending',
          type: 'endGame',
          timestamp: Date.now()
        };

        this.onTransactionUpdate?.(transaction);
        const receipt = await tx.wait();
        
        transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        this.onTransactionUpdate?.(transaction);

        if (receipt.status === 1) {
          console.log('✅ Emergency reset successful - status fixed!');
          this.currentGameId = null;
          return transaction;
        }
      } catch (emergencyError: any) {
        console.log('❌ Emergency reset failed:', emergencyError.message);
      }

      // YÖNTEM 2: Admin fonksiyonlarını dene (kontrat sahibi tarafından eklenmiş olabilir)
      try {
        console.log('🔄 Trying admin function: resetPlayerStatus');
        const gasOptions = await this.getOptimizedGasOptions(150000);
        const tx = await this.gameContract.resetPlayerStatus(this.currentAccount, gasOptions);
        
        const transaction: GameTransaction = {
          hash: tx.hash,
          status: 'pending',
          type: 'endGame',
          timestamp: Date.now()
        };

        this.onTransactionUpdate?.(transaction);
        const receipt = await tx.wait();
        
        transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        this.onTransactionUpdate?.(transaction);

        if (receipt.status === 1) {
          console.log('✅ Player status reset successfully with admin function');
          this.currentGameId = null;
          return transaction;
        }
      } catch (adminError: any) {
        console.log('❌ Admin resetPlayerStatus failed:', adminError.message);
      }

      // YÖNTEM 2: forceEndActiveGame admin fonksiyonunu dene
      try {
        console.log('🔄 Trying admin function: forceEndActiveGame');
        const gasOptions = await this.getOptimizedGasOptions(150000);
        const tx = await this.gameContract.forceEndActiveGame(this.currentAccount, gasOptions);
        
        const transaction: GameTransaction = {
          hash: tx.hash,
          status: 'pending',
          type: 'endGame',
          timestamp: Date.now()
        };

        this.onTransactionUpdate?.(transaction);
        const receipt = await tx.wait();
        
        transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        this.onTransactionUpdate?.(transaction);

        if (receipt.status === 1) {
          console.log('✅ Active game force ended successfully with admin function');
          this.currentGameId = null;
          return transaction;
        }
      } catch (adminError: any) {
        console.log('❌ Admin forceEndActiveGame failed:', adminError.message);
      }

      // YÖNTEM 3: Önce son gameId'yi bulmaya çalış
      let gameIdToEnd = await this.findLastGameId();
      
      if (gameIdToEnd === null) {
        console.log('⚠️ Could not find gameId from events, trying common values...');
        // Event bulunamazsa yaygın değerleri dene
        const possibleGameIds = [1, 0, 2, 3, 4, 5];
        
        for (const testId of possibleGameIds) {
          try {
            console.log(`🔄 Trying refundLife with gameId: ${testId}`);
            const gasOptions = await this.getOptimizedGasOptions(150000);
            const tx = await this.gameContract.refundLife(testId, gasOptions);
            
            const transaction: GameTransaction = {
              hash: tx.hash,
              status: 'pending',
              type: 'endGame',
              timestamp: Date.now()
            };

            this.onTransactionUpdate?.(transaction);
            const receipt = await tx.wait();
            
            transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
            this.onTransactionUpdate?.(transaction);

            if (receipt.status === 1) {
              console.log(`✅ Active game ended with gameId: ${testId}`);
              this.currentGameId = null;
              return transaction;
            }
          } catch (error: any) {
            console.log(`❌ GameId ${testId} failed, trying next...`);
            continue;
          }
        }
        
        // Hiçbir şey işe yaramadıysa
        throw new Error(
          'Kontrat hatalı durumda: isActive=true ama hiç oyun başlatılmamış. ' +
          'Bu sorunu çözmek için kontrat sahibi ile iletişime geç veya yeni bir hesap kullan.'
        );
      }
      
      // GameId bulunduysa refundLife ile dene
      console.log(`🎯 Using found gameId: ${gameIdToEnd}`);
      const gasOptions = await this.getOptimizedGasOptions(150000);
      const tx = await this.gameContract.refundLife(gameIdToEnd, gasOptions);

      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log(`✅ Active game ended successfully with gameId: ${gameIdToEnd}`);
        this.currentGameId = null;
      } else {
        throw new Error('Transaction failed');
      }

      return transaction;

    } catch (error: any) {
      console.error('Failed to force end game:', error);
      this.onError?.(error.message || 'Failed to end active game');
      throw error;
    }
  }

  // SENİN KURALLARIN: Oyun bitirme
  public async endGame(kills: number): Promise<GameTransaction> {
    if (!this.gameContract || !this.currentAccount || !this.currentGameId) {
      throw new Error('No active game');
    }

    try {
      console.log(`🏁 Ending game ${this.currentGameId} with ${kills} kills`);

      const tx = await this.gameContract.endGame(this.currentGameId, {
        gasLimit: 300000 // 200,000'den 300,000'e artırıldı
      });

      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log('✅ Game ended successfully');
        this.currentGameId = null;
      } else {
        throw new Error('Transaction failed');
      }

      return transaction;

    } catch (error: any) {
      console.error('Failed to end game:', error);
      this.onError?.(error.message || 'Failed to end game');
      throw error;
    }
  }

  // SENİN KURALLARIN: Kill kaydetme
  public async recordKill(victimAddress: string): Promise<void> {
    if (!this.gameContract || !this.currentGameId) return;

    try {
      const gasOptions = await this.getOptimizedGasOptions(100000);
      const tx = await this.gameContract.recordKill(this.currentGameId, victimAddress, gasOptions);

      await tx.wait();
      console.log('⚔️ Kill recorded on blockchain');

    } catch (error) {
      console.error('Failed to record kill:', error);
      // Don't throw error for kill recording failures
    }
  }

  // SENİN KURALLARIN: Ödül çekme
  public async claimRewards(): Promise<GameTransaction> {
    if (!this.gameContract || !this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🎁 Claiming rewards...');

      const gasOptions = await this.getOptimizedGasOptions(200000); // 150,000'den 200,000'e artırıldı
      const tx = await this.gameContract.claimRewards(gasOptions);

      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'claimRewards',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log('✅ Rewards claimed successfully');
      } else {
        throw new Error('Transaction failed');
      }

      return transaction;

    } catch (error: any) {
      console.error('Failed to claim rewards:', error);
      this.onError?.(error.message || 'Failed to claim rewards');
      throw error;
    }
  }

  // Player stats
  public async getPlayerStats(): Promise<PlayerStats | null> {
    console.log('🔍 getPlayerStats called with:', {
      hasContract: !!this.gameContract,
      hasAccount: !!this.currentAccount,
      account: this.currentAccount
    });
    
    if (!this.gameContract || !this.currentAccount) {
      console.log('❌ Missing contract or account');
      return null;
    }

    try {
      console.log('📞 Calling contract.getPlayer with address:', this.currentAccount);
      const stats = await this.gameContract.getPlayer(this.currentAccount);
      
      console.log('🔍 Raw contract stats:', stats);
      console.log('🔍 Stats type:', typeof stats);
      console.log('🔍 Stats length:', stats.length);
      
      if (!stats || stats.length < 9) {
        console.log('❌ Invalid stats format:', stats);
        return null;
      }
      
      const playerStats = {
        lives: Number(stats[0]),
        totalGamesPlayed: Number(stats[1]),
        totalKills: Number(stats[2]),
        totalSurvivalTime: Number(stats[3]),
        totalRewards: Number(ethers.formatEther(stats[4])),
        lastLifeRefill: Number(stats[5]),
        isActive: stats[6],
        isRegistered: stats[7], // YENİ
        currentGameId: Number(stats[8]), // YENİ
        totalGamesWon: 0
      };
      
      console.log('✅ Processed player stats:', playerStats);
      return playerStats;

    } catch (error: any) {
      console.error('❌ Failed to get player stats:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      return null;
    }
  }

  // Pending rewards
  public async getPendingRewards(): Promise<number> {
    if (!this.gameContract || !this.currentAccount) return 0;

    try {
      const rewards = await this.gameContract.getPendingRewards(this.currentAccount);
      return Number(ethers.formatEther(rewards));
    } catch (error) {
      console.error('Failed to get pending rewards:', error);
      return 0;
    }
  }

  // Life price
  public async getLifePrice(): Promise<number> {
    if (!this.gameContract) return 0.01;

    try {
      const price = await this.gameContract.lifePrice();
      return Number(ethers.formatEther(price));
    } catch (error) {
      console.error('Failed to get life price:', error);
      return 0.01;
    }
  }

  // Utility methods
  public async getBalance(): Promise<string> {
    if (!this.provider || !this.currentAccount) return "0";
    const balance = await this.provider.getBalance(this.currentAccount);
    return ethers.formatEther(balance);
  }

  public async getLeaderboardData(): Promise<PlayerStats[]> {
    if (!this.gameContract) return [];
    
    try {
      const playerCount = await this.gameContract.getPlayerCount();
      console.log('👥 Total players in contract:', playerCount);
      
      const playersData: PlayerStats[] = [];
      for (let i = 0; i < playerCount; i++) {
        const playerAddress = await this.gameContract.getPlayerAddressByIndex(i);
        const stats = await this.gameContract.getPlayer(playerAddress);
        playersData.push({
          isRegistered: true,
          currentGameId: 0,
          lives: Number(stats[0]),
          totalGamesPlayed: Number(stats[1]),
          totalKills: Number(stats[2]),
          totalSurvivalTime: Number(stats[3]),
          totalRewards: Number(ethers.formatEther(stats[4])),
          lastLifeRefill: Number(stats[5]),
          isActive: stats[6],
          totalGamesWon: 0 // Şimdilik 0, backend/contract güncellemesinde gerçek değerle değiştirilecek
        });
      }
      return playersData.sort((a, b) => b.totalKills - a.totalKills);
    } catch (error) {
      console.error('Failed to get leaderboard data:', error);
      return [];
    }
  }

  public async getRewardPoolBalance(): Promise<string> {
    if (!this.gameContract) return "0";
    
    try {
      const pool = await this.gameContract.rewardPool();
      return ethers.formatEther(pool);
    } catch (error) {
      console.error('Failed to get reward pool:', error);
      return "0";
    }
  }

  public async getPlayerAddressByIndex(index: number): Promise<string> {
    if (!this.gameContract) return "";
    return await this.gameContract.getPlayerAddressByIndex(index);
  }

  public isConnected(): boolean {
    return !!this.currentAccount && !!this.gameContract;
  }

  public getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  public getCurrentNetwork(): string {
    return this.currentNetwork;
  }

  public getCurrentGameId(): number | null {
    return this.currentGameId;
  }

  public disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.gameContract = null;
    this.currentAccount = null;
    this.currentGameId = null;
  }

  // Set contract addresses (for deployment)
  public setContractAddress(network: 'testnet' | 'mainnet', address: string): void {
    this.contractAddresses[network] = address;
    if (network === this.currentNetwork) {
      this.initializeContract();
    }
  }

  // Get weekly prize pool balance
  public async getWeeklyPrizePoolBalance(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      // Weekly reward pool wallet address
      const weeklyRewardPoolAddress = "0x52AEc2aDEbAcA9763348Bca790FcCd8d12CF7FB3";
      
      // Get balance of weekly reward pool wallet
      const balance = await this.provider.getBalance(weeklyRewardPoolAddress);
      const balanceInSonic = parseFloat(ethers.formatEther(balance));
      
      console.log(`💰 Weekly Prize Pool Balance: ${balanceInSonic} S`);
      return balanceInSonic;
    } catch (error: any) {
      console.error('❌ Failed to get weekly prize pool balance:', error.message);
      return 0;
    }
  }

  // Cancel reserved game (for lobby leave)
  public async cancelReservedGame(gameId: number): Promise<GameTransaction> {
    if (!this.gameContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`🔄 Canceling reserved game ${gameId}...`);
      
      const gasOptions = await this.getOptimizedGasOptions(150000);
      const tx = await this.gameContract.cancelReservedGame(gameId, gasOptions);
      
      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log(`✅ Reserved game ${gameId} canceled successfully`);
        this.currentGameId = null;
        return transaction;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error(`❌ Failed to cancel reserved game ${gameId}:`, error.message);
      throw error;
    }
  }

  // Emergency reset my status (for stuck players)
  public async emergencyResetMyStatus(): Promise<GameTransaction> {
    if (!this.gameContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🚨 Emergency resetting player status...');
      
      const gasOptions = await this.getOptimizedGasOptions(150000);
      const tx = await this.gameContract.emergencyResetMyStatus(gasOptions);
      
      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log('✅ Emergency reset successful - player status cleared');
        this.currentGameId = null;
        return transaction;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('❌ Emergency reset failed:', error.message);
      throw error;
    }
  }

  // 🚨 ADMIN ONLY: Reset all stuck players at once
  public async adminEmergencyResetAll(): Promise<GameTransaction> {
    if (!this.gameContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🚨 ADMIN: Emergency resetting ALL stuck players...');
      
      const gasOptions = await this.getOptimizedGasOptions(500000); // Higher gas for batch operation
      const tx = await this.gameContract.adminEmergencyResetAll(gasOptions);
      
      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log('✅ ADMIN: All stuck players reset successfully');
        this.currentGameId = null;
        return transaction;
      } else {
        throw new Error('Admin reset transaction failed');
      }
    } catch (error: any) {
      console.error('❌ ADMIN: Reset all failed:', error.message);
      throw error;
    }
  }

  // 🚨 ADMIN ONLY: Reset specific players
  public async batchResetPlayers(playerAddresses: string[]): Promise<GameTransaction> {
    if (!this.gameContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`🚨 ADMIN: Batch resetting ${playerAddresses.length} players...`);
      
      const gasOptions = await this.getOptimizedGasOptions(200000 + (playerAddresses.length * 50000));
      const tx = await this.gameContract.batchResetPlayers(playerAddresses, gasOptions);
      
      const transaction: GameTransaction = {
        hash: tx.hash,
        status: 'pending',
        type: 'endGame',
        timestamp: Date.now()
      };

      this.onTransactionUpdate?.(transaction);
      const receipt = await tx.wait();
      
      transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
      this.onTransactionUpdate?.(transaction);

      if (receipt.status === 1) {
        console.log(`✅ ADMIN: Batch reset successful for ${playerAddresses.length} players`);
        return transaction;
      } else {
        throw new Error('Batch reset transaction failed');
      }
    } catch (error: any) {
      console.error('❌ ADMIN: Batch reset failed:', error.message);
      throw error;
    }
  }
}

// Singleton instance
export const web3Service = new Web3Service();