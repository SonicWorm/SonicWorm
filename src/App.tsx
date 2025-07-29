import { useState, useEffect } from 'react';
import { GameComponent } from './components/GameComponent';
import { SplashScreen } from './components/SplashScreen';
import { Leaderboard } from './components/Leaderboard';
import MainMenu from './components/MainMenu';
import { web3Service, PlayerStats } from './services/Web3Service';
import { multiplayerService } from './services/MultiplayerService';
import './App.css';

interface GameStats {
  currentLives: number;
  maxLives: number;
  totalKills: number;
  gamesPlayed: number;
  gamesWon: number; // yeni sayaç
  bestKills: number;
  totalSurvivalTime: number;
  totalEarned: number; // yeni sayaç
}

// Helper functions for leaderboard
const getRankIcon = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'game' | 'leaderboard'>('menu');
  const [gameMode] = useState<'demo' | 'blockchain'>('demo');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [gameStats, setGameStats] = useState<GameStats>({
    currentLives: 0, // 0'DAN BAŞLAT
    maxLives: 3,
    totalKills: 0,
    gamesPlayed: 0,
    gamesWon: 0, // yeni sayaç
    bestKills: 0, // eksik olan alan eklendi
    totalSurvivalTime: 0,
    totalEarned: 0 // yeni sayaç
  });
  const [isGameActive, setIsGameActive] = useState(false);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [lifePrice, setLifePrice] = useState(0.01);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState("0");
  const [leaderboardData, setLeaderboardData] = useState<(PlayerStats & { walletAddress: string })[]>([]);
  const [rewardPool, setRewardPool] = useState("0");
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  // Lobi bilgilerini tutacak arayüz
  interface LobbyInfo {
    state: 'idle' | 'gathering' | 'waiting' | 'confirming';
    playerCount: number;
    maxPlayers: number;
    confirmedCount: number;
    timeRemaining: number;
  }
  
  const [lobbyState, setLobbyState] = useState<LobbyInfo | null>(null);

  // Web3 service event listeners
  useEffect(() => {
    // Sayfa yüklendiğinde aktif oyunu kontrol et
    const checkActiveGame = async () => {
      const storedAccount = localStorage.getItem('walletAddress');
      if (storedAccount) {
        try {
          await web3Service.forceEndActiveGame();
          console.log('🔄 Active game force ended on page load');
        } catch (error) {
          console.log('No active game found on page load');
        }
      }
    };
    
    checkActiveGame();

    web3Service.setOnAccountChange((account) => {
      console.log('🔗 Account change detected:', account);
      
      if (account) {
        console.log('✅ Wallet connected');
        setWalletAddress(account);
        setIsWalletConnected(true);
        // NEW: Store wallet address for player mapping
        localStorage.setItem('walletAddress', account);
        console.log('💾 Wallet address stored:', account);
      } else {
        console.log('❌ Wallet disconnected');
        setWalletAddress('');
        setIsWalletConnected(false);
        // CLEANUP: Remove wallet address from storage
        localStorage.removeItem('walletAddress');
      }
    });

    web3Service.setOnTransactionUpdate((tx) => {
      console.log(`🔄 Transaction update: ${tx.type} - ${tx.status} - ${tx.hash}`);
      

      // --- EN ÖNEMLİ KISIM ---
      // Eğer işlem başarılı bir şekilde onaylandıysa,
      // oyuncunun en güncel istatistiklerini (yeni can sayısı dahil) tekrar çek.
      if (tx.status === 'confirmed') {
        console.log(`✅ Transaction ${tx.hash} confirmed. Reloading stats in 1.5 seconds...`);
        // Küçük bir gecikme, blockchain'in state'i tamamen güncellemesine zaman tanır.
        setTimeout(() => {
          console.log(`🔄 Calling loadPlayerStats after transaction confirmation...`);
          loadPlayerStats(); 
        }, 1500); // 1.5 saniye sonra yeniden yükle
      }
    });

    web3Service.setOnError((error) => {
      console.error('Web3 Error:', error);
      alert(`Blockchain Error: ${error}`);
    });

    // Multiplayer service event handlers
    multiplayerService.setOnMatchStarting(() => {
      console.log('🎯 Match starting! Starting blockchain game...');
      handleMatchStarting();
    });

    multiplayerService.setOnLobbyStatus((status) => {
      console.log('📊 LOBBY UPDATE FROM SERVER:', status);
      
      // Eğer null gelirse lobby'den çıkarıldık
      if (!status) {
        console.log('🚪 Kicked from lobby, resetting state');
        setLobbyState(null);
        return;
      }
      
      // Server'dan gelen data'yı LobbyInfo formatına dönüştür
      const lobbyInfo: LobbyInfo = {
        state: (status as any).lobbyState || 'idle',
        playerCount: status.players || 0,
        maxPlayers: status.maxPlayers || 30,
        confirmedCount: (status as any).confirmedCount || 0,
        timeRemaining: status.timeRemaining || 0
      };
      setLobbyState(lobbyInfo);
    });

    multiplayerService.setOnGameStarted(() => {
      console.log('🎮 Game started! Switching to game screen...');
      setLobbyState(null);
      setCurrentScreen('game');
    });

    multiplayerService.setOnError((error) => {
      console.error('🚨 Multiplayer error:', error);
      alert(error);
    });

    // Can iade callback'i ekle
    multiplayerService.setOnLifeRefunded((data) => {
      console.log('💰 Life refunded callback received:', data);
      setGameStats(prev => ({ 
        ...prev, 
        currentLives: Math.min(prev.currentLives + 1, 3) // Max 3 can
      }));
      // Tam güncelleme için stats'ı reload et
      setTimeout(() => loadPlayerStats(), 1000);
    });

    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    // Bu fonksiyon artık sadece cüzdan bağlantısını tetikleyecek,
    // veri yüklemeyi değil. Veri yükleme işini callback ile kontrol ediyoruz.
    if (window.ethereum && window.ethereum.selectedAddress) {
      await web3Service.connectWallet(() => {
        console.log("✅ Existing connection detected, loading stats...");
        loadPlayerStats();
      });
    }
  };

  const loadPlayerStats = async () => {
    try {
      console.log('🔄 Loading player stats...');
      setLoadingLeaderboard(true);
      const stats = await web3Service.getPlayerStats();
      const rewards = await web3Service.getPendingRewards();
      const price = await web3Service.getLifePrice();
      const bal = await web3Service.getBalance();
      const weeklyBalance = await web3Service.getWeeklyPrizePoolBalance();
      setBalance(bal);
      setRewardPool(weeklyBalance.toString());
      
      console.log('📊 Blockchain stats:', stats);
      console.log('💰 Rewards:', rewards);
      console.log('💎 Life price:', price);
      console.log('💳 Balance:', bal);

      if (stats) {
        const newGameStats = {
          currentLives: stats.lives,
          maxLives: 3,
          totalKills: stats.totalKills,
          gamesPlayed: stats.totalGamesPlayed,
          gamesWon: stats.totalGamesWon,
          bestKills: stats.totalKills,
          totalSurvivalTime: stats.totalSurvivalTime,
          totalEarned: 0
        };
        
        console.log('🎮 Setting new game stats:', newGameStats);
        setGameStats(newGameStats);
      } else {
        console.log('❌ No stats received from blockchain');
      }

      setPendingRewards(rewards);
      setLifePrice(price);

      const leaderboardRaw = await web3Service.getLeaderboardData();
      let leaderboard: (PlayerStats & { walletAddress: string })[] = [];
      for (let i = 0; i < leaderboardRaw.length; i++) {
        const playerStats = leaderboardRaw[i];
        let address = "";
        try {
          address = await web3Service.getPlayerAddressByIndex(i);
        } catch {}
        leaderboard.push({ ...playerStats, walletAddress: address });
      }
      const pool = await web3Service.getRewardPoolBalance();
      setLeaderboardData(leaderboard);
      setRewardPool(pool);
      
      console.log('✅ Player stats loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load player stats:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      // Web3Service'e, "işin bittiğinde loadPlayerStats'i çağır" diyoruz.
      await web3Service.connectWallet(() => {
        console.log("✅ Connect wallet tamamlandı, şimdi stats yükleniyor.");
        loadPlayerStats();
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Make sure MetaMask is installed and unlocked.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    web3Service.disconnect();
    setIsWalletConnected(false);
    setWalletAddress('');
    setIsGameActive(false);
    // CLEANUP: Remove wallet address from storage
    localStorage.removeItem('walletAddress');
    setGameStats({
      currentLives: 0,
      maxLives: 3,
      totalKills: 0,
      gamesPlayed: 0,
      gamesWon: 0, // Yeni alanı da sıfırla
      bestKills: 0,
      totalSurvivalTime: 0,
      totalEarned: 0 // Yeni alanı da sıfırla
    });
    console.log('🔌 Wallet disconnected');
  };

  const handleBuyLives = async (amount: number) => {
    try {
      setLoading(true);
      const transaction = await web3Service.buyLives(amount);
      console.log(`💰 Buying ${amount} lives - Transaction: ${transaction.hash}`);
    } catch (error) {
      console.error('Failed to buy lives:', error);
      alert('Failed to buy lives! Make sure you have enough Sonic tokens.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    // 1. Cüzdan bağlı mı ve adres var mı?
    if (!isWalletConnected || !walletAddress) {
      alert("Lobiye katılmak için önce cüzdanınızı bağlayın!");
      return;
    }

    try {
      console.log("🎯 Reserving game slot (no life cost yet)...");
      
      // 2. Blockchain işlemi - sadece gameId al, can harcama
      const { gameId } = await web3Service.reserveGame();
      
      if (!gameId || gameId === 0) {
        throw new Error("Kontrattan geçerli bir oyun ID'si alınamadı.");
      }
      
      console.log(`✅ GameID ${gameId} reserved, life will be deducted when game starts`);
      
      // 3. Can sayısını henüz güncelleme - oyun başlayınca server güncelleyecek
      
      // 4. GameID ile birlikte sunucuya gönderilecek veri
      const playerData = {
        playerName: "Player" + Math.floor(Math.random() * 1000),
        walletAddress,
        gameId: gameId
      };
      
      console.log("JOIN_LOBBY gönderiliyor:", playerData);

      // 5. Bağlantı yoksa önce bağlan
      if (!multiplayerService.isConnected()) {
          await multiplayerService.connect();
      }
      
      // 6. Lobiye katıl
      multiplayerService.joinLobby(playerData);
      
    } catch (error: any) {
      console.error("❌ Lobby join failed:", error);
      
      // Aktif oyun algılandıysa kullanıcıya seçenek sun
      if (error.message === 'ACTIVE_GAME_DETECTED') {
        const shouldEndGame = confirm(
          "Zaten aktif bir oyununuz var! Yeni oyuna başlamak için mevcut oyunu bitirmek gerekiyor.\n\n" +
          "Aktif oyunu bitirmek ister misiniz?\n\n" +
          "TAMAM = Aktif oyunu bitir ve yeni oyuna başla\n" +
          "İPTAL = Hiçbir şey yapma"
        );
        
        if (shouldEndGame) {
          await handleEndActiveGame();
        }
      } else if (error.message && error.message.includes('Kontrat hatalı durumda')) {
        // Kontrat bug'ı durumu için özel mesaj
        alert(
          "⚠️ KONTRAT HATA DURUMU TESPİT EDİLDİ\n\n" +
          "Hesabınız kontrat'ta hatalı bir durumda:\n" +
          "• isActive: true (aktif oyun var)\n" +
          "• totalGames: 0 (hiç oyun oynanmamış)\n\n" +
          "Bu teknik bir sorundur. Çözüm seçenekleri:\n" +
          "1. Kontrat sahibi ile iletişime geçin\n" +
          "2. Yeni bir cüzdan adresi deneyin\n" +
          "3. Birkaç saat sonra tekrar deneyin\n\n" +
          "Discord: [discord linki]\n" +
          "Telegram: [telegram linki]"
        );
      } else {
        alert(`Lobiye katılma başarısız: ${error.message}`);
      }
    }
  };

  const handleEndActiveGame = async () => {
    try {
      setLoading(true);
      console.log("🛑 Ending active game...");
      
      await web3Service.forceEndActiveGame();
      
      console.log("✅ Active game ended, now trying to join lobby again...");
      alert("Aktif oyun bitirildi! Şimdi tekrar lobiye katılmayı deneyin.");
      
      // Player stats'ı yeniden yükle (isActive durumu değişebilir)
      await loadPlayerStats();
      
    } catch (error: any) {
      console.error("❌ Failed to end active game:", error);
      alert(`Aktif oyun bitirilemedi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      console.log("🔄 Lobiden çıkılıyor...");
      setLoading(true);
      await multiplayerService.leaveLobby();
      setLobbyState(null);
      console.log("✅ Lobiden başarıyla çıkıldı.");
    } catch (error: any) {
      console.error("❌ Lobiden çıkma işlemi başarısız oldu:", error);
      alert(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJoin = () => {
    // Kullanıcı CONFIRM JOIN butonuna bastı = onaylıyor
    console.log("🎯 Player confirmed! Sending confirmation to server...");
    
    // Sadece server'a onay gönder - blockchain zaten JOIN_LOBBY'de yapıldı
    multiplayerService.confirmJoin();
    
    console.log("✅ Confirmation sent to server");
  };

  const handleMatchStarting = async () => {
    // Bu fonksiyon artık sadece otomatik çağrılan durumlarda kullanılır
    console.log("🎯 Match starting automatically...");
    // Confirmation aşamasına geçildi, kullanıcı onay verecek
  };

  const handleGameEnd = async (kills: number, survivalTime: number) => {
    setIsGameActive(false);
    // ESKİ SİSTEM KALDIRILDI - Artık prize pool sistemi kullanılıyor
    // Rewards server'dan contract ile dağıtılıyor
    setGameStats(prev => ({
      ...prev,
      totalKills: prev.totalKills + kills,
      gamesWon: prev.gamesWon, // Game won logic server'da
      totalSurvivalTime: prev.totalSurvivalTime + survivalTime,
      totalEarned: prev.totalEarned // Earnings server/contract'tan gelecek
    }));

    console.log('🏁 Game ended - Kills:', kills, 'Survival Time:', survivalTime);

    // 5 saniye sonra otomatik menüye dön
    setTimeout(() => {
      setCurrentScreen('menu');
      console.log('🏠 Auto redirect to menu after game end');
    }, 5000);

    try {
      const transaction = await web3Service.endGame(kills);
      console.log(`🎮 Game ended on blockchain - Transaction: ${transaction.hash}`);

      // Rewards server'dan prize pool ile dağıtılıyor
      console.log(`🏆 Game ended - Server handles prize distribution`);
    } catch (error) {
      console.error('Failed to end game on blockchain:', error);
    }
  };


  const handleDemoGameEnd = (kills: number, survivalTime: number) => {
    setIsGameActive(false);
    setGameStats(prev => ({
      ...prev,
      totalKills: prev.totalKills + kills,
      bestKills: Math.max(prev.bestKills, kills),
      totalSurvivalTime: prev.totalSurvivalTime + survivalTime
    }));

    console.log(`🎮 Demo Game ended - Kills: ${kills}, Survival: ${survivalTime}ms`);
  };

  const handleKillUpdate = (_kills: number) => {
    // Kill tracking handled by game logic
  };

  const handleTimeUpdate = (_time: number) => {
    // Time tracking handled by game logic
  };

  // ESKİ SİSTEM KALDIRILDI - Ödüller server'dan prize pool sisteminden geliyor

  const handleClaimReward = async () => {
    if (pendingRewards <= 0) {
      alert("You have no rewards to claim.");
      return;
    }
    setLoading(true);
    try {
      await web3Service.claimRewards();
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      alert("Failed to claim rewards.");
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const renderMainMenu = () => (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
    }}>

      {/* Banner Section */}
      <div className="text-center py-8 border-b border-gray-800">
        <div className="flex items-center justify-center gap-4 mb-4">
          <img
            src="/sonicworm-logo.svg"
            alt="SonicWorm"
            className="w-12 h-12"
            style={{ filter: 'drop-shadow(0 0 20px #00ffcc)' }}
          />
          <h1 className="text-4xl font-bold" style={{
            background: 'linear-gradient(45deg, #00ffcc, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            SONICWORM
          </h1>
        </div>
        <p className="text-gray-400">GameFi Evolution</p>
      </div>

      {/* Main Content - Centered Layout */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-8">
        <div className="max-w-6xl w-full space-y-8">

          {/* Top Section - Two Equal Columns */}
          <div className="grid grid-cols-2 gap-8">

            {/* Left Column - Enter the Arena & Player Stats */}
            <div className="space-y-6">

              {/* Enter the Arena Card - CENTERED */}
              <div className="bg-black/60 rounded-2xl p-8 text-center border border-cyan-500/30"
                style={{
                  boxShadow: '0 0 30px rgba(0, 255, 204, 0.2)',
                  minHeight: isWalletConnected ? 'auto' : '400px'
                }}>

                <div className="mb-8">
                  <div className="w-full h-1 rounded-full mb-6"
                    style={{
                      background: 'linear-gradient(90deg, #00ffcc, #00ddaa)',
                      boxShadow: '0 0 20px rgba(0, 255, 204, 0.6)'
                    }}>
                  </div>

                  <h2 className="text-4xl font-bold mb-4 text-center w-full" style={{
                    color: '#00ffcc',
                    textShadow: '0 0 20px rgba(0, 255, 204, 0.5)',
                    textAlign: 'center'
                  }}>
                    ENTER THE ARENA
                  </h2>

                  <p className="text-gray-300 text-lg mb-8 text-center w-full" style={{
                    textAlign: 'center'
                  }}>
                    Hunt • Grow • Earn Real Rewards
                  </p>
                </div>

                {isWalletConnected && (
                  <MainMenu
                    lobbyState={lobbyState}
                    isGameActive={isGameActive}
                    currentLives={gameStats.currentLives}
                    onJoinLobby={handleJoinLobby}
                    onLeaveLobby={handleLeaveLobby}
                    onConfirmJoin={handleConfirmJoin}
                  />
                )}
              </div>

              {/* Player Stats - Only show when wallet is connected */}
              {isWalletConnected && (
                <div className="bg-black/60 rounded-2xl p-8 border border-purple-500/30 flex-1"
                  style={{
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
                    minHeight: '300px'
                  }}>
                  <h3 className="text-2xl font-bold mb-8 text-purple-400 flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    Player Stats
                  </h3>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center p-4 rounded-xl bg-black/30">
                      <div className="text-4xl font-bold text-white mb-2">{gameStats.gamesPlayed}</div>
                      <div className="text-gray-400 font-medium">Games Played</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-black/30">
                      <div className="text-4xl font-bold text-white mb-2">{gameStats.totalKills}</div>
                      <div className="text-gray-400 font-medium">Total Kills</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-black/30">
                      <div className="text-4xl font-bold text-white mb-2">{gameStats.gamesWon}</div>
                      <div className="text-gray-400 font-medium">Game Won</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-black/30">
                      <div className="text-4xl font-bold text-white mb-2">{Math.floor(gameStats.totalSurvivalTime / 60000)}</div>
                      <div className="text-gray-400 font-medium">Minutes Played</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-black/30 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-yellow-400 mb-2">{pendingRewards.toFixed(2)}</div>
                      <div className="text-gray-400 font-medium mt-1">Pending Rewards S</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-black/30">
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <button
                          onClick={handleClaimReward}
                          disabled={loading || pendingRewards <= 0}
                          className="w-full py-3 px-6 rounded-xl font-bold text-lg text-black bg-gradient-to-r from-cyan-400 via-green-300 to-blue-400 shadow-lg border border-cyan-400/40 hover:from-cyan-300 hover:to-green-400 transition-all duration-200 tracking-wide uppercase disabled:opacity-60"
                          style={{ minWidth: 140, minHeight: 48, boxShadow: '0 0 20px #00ffcc44' }}
                        >
                          {loading ? 'Claiming...' : 'CLAIM REWARD'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Enhanced Professional Wallet Connection */}
            <div className="bg-black/60 rounded-2xl p-8 border border-blue-500/30"
              style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)' }}>

              {isWalletConnected ? (
                <div className="space-y-6">
                  {/* Enhanced Professional Wallet Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(45deg, #3b82f6, #6366f1)' }}>
                        <span className="text-xl">💼</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-blue-400">Wallet Connected</h3>
                        <p className="text-sm text-gray-500">Ready to play</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Enhanced Professional Wallet Info Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-400 text-sm">Wallet Address</span>
                          <div className="font-mono text-blue-400 font-medium">
                            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20" style={{ minHeight: 80 }}>
                      <div className="flex items-center h-full" style={{ justifyContent: 'flex-end' }}>
                        <div className="text-right ml-auto">
                          <span className="text-gray-400 text-sm">Balance</span>
                          <div className="text-2x font-bold text-cyan-400">
                            {balance} S
                          </div>
                        </div>
                        <div className="text-3xl"></div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Professional Lives Section */}
                  <div className="p-6 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-lg">❤️</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-red-400">Lives</h4>
                        <p className="text-sm text-gray-400">{gameStats.currentLives}/{gameStats.maxLives} available</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-6">
                      {Array.from({ length: gameStats.maxLives }).map((_, i) => (
                        <div
                          key={i}
                          className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300"
                          style={{
                            background: i < gameStats.currentLives
                              ? 'linear-gradient(45deg, #ef4444, #f87171)'
                              : 'rgba(75, 85, 99, 0.3)',
                            boxShadow: i < gameStats.currentLives
                              ? '0 0 20px rgba(239, 68, 68, 0.6)'
                              : 'none',
                            transform: i < gameStats.currentLives ? 'scale(1.1)' : 'scale(0.9)'
                          }}
                        >
                          {i < gameStats.currentLives ? '❤️' : '💔'}
                        </div>
                      ))}
                    </div>

                    {/* Enhanced Professional Life Purchase Section */}
                    <div className="bg-black/20 rounded-xl p-4 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center sonicworm-float">
                          <span className="text-2xl">🛒</span>
                        </div>
                        <h5 className="text-lg font-extrabold text-green-300 sonicworm-text-glow tracking-wide uppercase">Purchase Lives</h5>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((lives) => {
                          // Bu butonu aktif etmek için yeterli can slotu var mı?
                          const canBuy = gameStats.currentLives + lives <= gameStats.maxLives;
                          return (
                          <button
                            key={lives}
                            onClick={() => handleBuyLives(lives)}
                              // Eğer yeterli slot yoksa VEYA bir işlem yükleniyorsa butonu pasif yap
                              disabled={!canBuy || loading}
                              className="sonicworm-card sonicworm-btn group relative flex flex-col items-center justify-center p-2 rounded-xl shadow-md border border-green-400/20 hover:border-green-300/60 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                              style={{ minWidth: 70, minHeight: 80 }}
                            >
                              <div className="text-2xl mb-1 sonicworm-pulse" style={{ color: '#ef4444', textShadow: '0 0 6px #ef4444, 0 0 12px #fff2' }}>
                                {!canBuy ? '🔒' : '❤️'}
                              </div>
                              <div className="text-sm font-bold text-white mb-0.5 tracking-wider">x{lives}</div>
                              <div className="text-xs font-bold text-green-200 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-green-400/20 mb-1 shadow-sm">
                                {(lives * lifePrice)} <span className="text-green-400 font-extrabold">S</span>
                            </div>
                              {!canBuy ? (
                                <span className="text-[10px] text-red-400 font-semibold tracking-wide mt-1">Max Lives</span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-semibold tracking-wide">Instant</span>
                              )}
                              <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-green-400/10 via-green-500/20 to-green-400/10 blur-sm opacity-60"></div>
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(45deg, #3b82f6, #6366f1)',
                      boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)'
                    }}>
                    <span className="text-4xl">🔗</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-blue-400">
                    Connect Wallet
                  </h3>
                  <p className="text-gray-400 text-lg mb-8">
                    Connect your wallet to start playing and earning rewards
                  </p>
                  <button
                    onClick={handleConnectWallet}
                    disabled={loading}
                    className="w-full py-4 px-8 rounded-xl font-bold text-xl transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(45deg, #3b82f6, #6366f1)',
                      color: 'white',
                      boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Full Width Leaderboard */}
          <div className="sonicworm-card rounded-lg p-6 bg-black/60 border border-yellow-500/30" style={{ boxShadow: '0 0 30px rgba(234, 179, 8, 0.2)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(45deg, #00ffcc, #00ddaa)' }}>
                  <span className="flex items-center justify-center w-full h-full text-sm font-bold text-black">🏆</span>
                </div>
                <h2 className="text-2xl font-bold sonicworm-text-glow" style={{ color: '#00ffcc' }}>
              Top Players
                </h2>
              </div>
              <div className="text-lg">
                Weekly Prize Pool: <span className="font-bold text-white">{rewardPool} S</span>
              </div>
            </div>
            {/* Game Rules Info */}
            <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.3)' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#00ffcc' }}>🎯 How to Win</h3>
              <p className="text-gray-300 text-sm">
                Kill the most players, finish in top 3, and climb the leaderboard
              </p>
            </div>
            {/* Leaderboard Table */}
            <div className="space-y-2">
              {loadingLeaderboard ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : (
                leaderboardData.map((entry, index) => (
                  <div
                    key={entry.walletAddress}
                    className="flex items-center justify-between p-4 rounded-lg transition-all hover:bg-gray-700"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold w-12 text-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div>
                        <div className="font-bold text-white">{entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}</div>
                        <div className="text-xs text-gray-400">
                          {entry.walletAddress}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-2xl" style={{ color: '#00ffcc' }}>
                          {entry.totalKills}
                        </div>
                        <div className="text-xs text-gray-400">Kills</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{entry.totalGamesPlayed}</div>
                        <div className="text-xs text-gray-400">Games</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{entry.totalKills}</div>
                        <div className="text-xs text-gray-400">Best Kills</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-500">
                Leaderboard updates every 5 minutes • Points reset weekly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (currentScreen === 'game') {
    return (
      <GameComponent
        onGameEnd={gameMode === 'demo' ? handleDemoGameEnd : handleGameEnd}
        onKillUpdate={handleKillUpdate}
        onTimeUpdate={handleTimeUpdate}
        onBackToMenu={() => setCurrentScreen('menu')}
      />
    );
  }

  if (currentScreen === 'leaderboard') {
    return (
      <Leaderboard />
    );
  }

  return renderMainMenu();
}

export default App;