import React, { useEffect, useRef, useState } from 'react';
import { gameManager } from '../game/GameConfig';
import { GameEndOverlay } from './GameEndOverlay';

interface GameComponentProps {
  onGameEnd?: (kills: number, survivalTime: number) => void;
  onKillUpdate?: (kills: number) => void;
  onTimeUpdate?: (time: number) => void;
  onBackToMenu?: () => void;
}

export const GameComponent: React.FC<GameComponentProps> = ({
  onGameEnd,
  onKillUpdate,
  onTimeUpdate,
  onBackToMenu
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [currentKills, setCurrentKills] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'ended'>('loading');
  const isInitializing = useRef(false);
  
  // REAL-TIME GAME DATA
  const [prizePool, setPrizePool] = useState(0);
  const [topPlayers, setTopPlayers] = useState<Array<{name: string, kills: number}>>([]);
  const [connectedPlayers, setConnectedPlayers] = useState(0);
  const [gameState, setGameState] = useState<any>(null);
  
  // GAME END DATA
  const [gameEndData, setGameEndData] = useState<{isWinner: boolean, prizeWon: number} | null>(null);

  useEffect(() => {
    if (gameContainerRef.current && !isGameLoaded && !isInitializing.current) {
      initializeGame();
    }

    return () => {
      if (isGameLoaded) {
        console.log('🧹 GameComponent cleanup: destroying game');
        gameManager.destroyGame();
        setIsGameLoaded(false);
        isInitializing.current = false;
      }
    };
  }, []); // Remove isGameLoaded from dependency to prevent multiple initializations

  useEffect(() => {
    // NEW: Server game end event listener
    const handleGameEnd = (event: CustomEvent) => {
      const { finalLeaderboard, players, gameState, prizeDistribution, survivors } = event.detail;
      
      // Get my stats from server data
      const myWalletAddress = localStorage.getItem('walletAddress');
      const myPlayer = players?.find((p: any) => p.walletAddress === myWalletAddress);
      
      const kills = myPlayer?.kills || currentKills;
      const survivalTime = gameState?.timeRemaining ? 
        (300000 - gameState.timeRemaining) : currentTime; // 5 min - remaining
      
      // NEW WINNER LOGIC: Top 3 survivors are winners (regardless of prize)
      const myPosition = finalLeaderboard?.findIndex((p: any) => p.walletAddress === myWalletAddress) + 1;
      const amISurvivor = myPlayer?.isAlive || false;
      const survivorPosition = amISurvivor ? myPosition : null;
      
      // Winner = Top 3 survivors OR anyone who got a prize
      const myPrizeEntry = prizeDistribution?.find((p: any) => p.walletAddress === myWalletAddress);
      const isWinner = (amISurvivor && survivorPosition && survivorPosition <= 3) || !!myPrizeEntry;
      const prizeWon = myPrizeEntry?.prize || 0;
      
      setCurrentKills(kills);
      setCurrentTime(survivalTime);
      setGameStatus('ended');
      setGameEndData({ isWinner, prizeWon });
      
      console.log('🏁 Game ended by server:', { 
        kills, 
        survivalTime, 
        isWinner, 
        prizeWon,
        myPosition,
        survivorPosition,
        amISurvivor,
        position: myPrizeEntry?.position,
        totalSurvivors: survivors
      });
      onGameEnd?.(kills, survivalTime);
    };

    const handleKillUpdate = (event: CustomEvent) => {
      const { kills } = event.detail;
      setCurrentKills(kills);
      onKillUpdate?.(kills);
    };

    const handleTimeUpdate = (event: CustomEvent) => {
      const { time } = event.detail;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };


    // REAL-TIME DATA UPDATES
    const handleGameStateUpdate = (event: CustomEvent) => {
      const { prizePool, players, connectedCount, gameState: serverGameState } = event.detail;
      
      if (serverGameState) {
        setGameState(serverGameState); // Server'dan gelen gerçek süreyi kullan
      }
      
      if (prizePool !== undefined) {
        setPrizePool(prizePool);
      }
      
      if (players && Array.isArray(players)) {
        // Tüm oyuncuları al (sadece hayatta olanları değil)
        const sortedPlayers = players
          .filter((player: any) => player.kills >= 0) // Tüm oyuncuları göster (kill >= 0)
          .sort((a: any, b: any) => b.kills - a.kills)
          .slice(0, 3)
          .map((player: any, index: number) => ({
            name: `Player${index + 1}`,
            kills: player.kills || 0
          }));
        
        setTopPlayers(sortedPlayers);
        console.log('🏆 Leaderboard updated:', sortedPlayers);
      }
      
      if (connectedCount !== undefined) {
        setConnectedPlayers(connectedCount);
      }
    };

    window.addEventListener('gameEnded', handleGameEnd as EventListener);
    window.addEventListener('killUpdated', handleKillUpdate as EventListener);
    window.addEventListener('timeUpdated', handleTimeUpdate as EventListener);
    window.addEventListener('gameStateUpdated', handleGameStateUpdate as EventListener);

    return () => {
      window.removeEventListener('gameEnded', handleGameEnd as EventListener);
      window.removeEventListener('killUpdated', handleKillUpdate as EventListener);
      window.removeEventListener('timeUpdated', handleTimeUpdate as EventListener);
      window.removeEventListener('gameStateUpdated', handleGameStateUpdate as EventListener);
    };
  }, [onGameEnd, onKillUpdate, onTimeUpdate]);

  // ESKİ SİSTEM KALDIRILDI - Ödüller server'dan prize pool'dan geliyor

  const initializeGame = async () => {
    try {
      // Prevent multiple simultaneous initializations
      if (isInitializing.current) {
        console.log('🎮 Game already initializing, skipping...');
        return;
      }

      isInitializing.current = true;
      setGameStatus('loading');
      console.log('🎮 Initializing SonicWorm game...');
      
      await gameManager.startGame('game-container');
      
      setIsGameLoaded(true);
      setGameStatus('playing');
      console.log('✅ SonicWorm game initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      setGameStatus('ended');
    } finally {
      isInitializing.current = false;
    }
  };

  // REMOVED: handleRestart - No more play again button, auto return to menu

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src="/sonicworm-logo.svg"
              alt="SonicWorm"
              className="w-12 h-12"
              style={{ filter: 'drop-shadow(0 0 20px #00ffcc)' }}
            />
            <h1 className="text-3xl font-bold text-white">
              🐛 SonicWorm Arena
            </h1>
          </div>
          
          <div className="flex gap-2">
            {/* 🚨 ADMIN EMERGENCY BUTTON */}
            <button
              onClick={async () => {
                try {
                  console.log('🚨 ADMIN: Kurtarma işlemi başlatılıyor...');
                  const { web3Service } = await import('../services/Web3Service');
                  await web3Service.adminEmergencyResetAll();
                  alert('✅ TÜM SIKIŞAN OYUNCULAR KURTARILDI!');
                } catch (error: any) {
                  console.error('❌ Kurtarma başarısız:', error);
                  alert('❌ Kurtarma başarısız: ' + error.message);
                }
              }}
              className="px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(45deg, #ff4444, #cc0000)' }}
              title="Tüm sıkışan oyuncuları kurtar (ADMIN ONLY)"
            >
              🚨 KURTAR TÜM OYUNCULAR
            </button>
            
            {onBackToMenu && gameStatus === 'ended' && (
              <button
                onClick={onBackToMenu}
                className="px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}
              >
                ← Back to Menu
              </button>
            )}
          </div>
        </div>

        {/* Game Container */}
        <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/30" 
             style={{ boxShadow: '0 0 30px rgba(0, 255, 204, 0.2)' }}>
          
          <div
            ref={gameContainerRef}
            id="game-container"
            className="w-full bg-gray-900"
            style={{ height: '70vh', minHeight: '500px' }}
          />

          {/* NEW: Prize Pool + Leaderboard UI */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-yellow-500/50" 
                 style={{ boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)' }}>
              
              {/* Prize Pool */}
              <div className="text-center mb-3">
                <div className="text-yellow-400 text-sm font-medium">💰 PRIZE POOL</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {prizePool > 0 ? `${prizePool.toFixed(1)} S` : '0.0 S'}
                </div>
                <div className="text-xs text-gray-400">
                  {connectedPlayers} players online
                </div>
              </div>
              
              {/* Top 3 Players */}
              <div className="mb-3">
                <div className="text-cyan-400 text-xs font-medium mb-1">🏆 TOP KILLERS</div>
                <div className="space-y-1">
                  {topPlayers.length > 0 ? (
                    topPlayers.map((player, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className={
                          index === 0 ? "text-yellow-300" : 
                          index === 1 ? "text-gray-300" : "text-orange-300"
                        }>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {player.name}
                        </span>
                        <span className="text-white font-bold">{player.kills} kills</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 text-center">
                      No kills yet...
                    </div>
                  )}
                </div>
              </div>
              
              {/* My Stats */}
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-cyan-400">My Kills:</span>
                  <span className="text-white font-bold">{currentKills}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cyan-400">Time Left:</span>
                  <span className="text-white font-bold">
                    {Math.floor((gameState?.timeRemaining || 0)/60000)}:{Math.floor(((gameState?.timeRemaining || 0)%60000)/1000).toString().padStart(2,'0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Overlay */}
          {gameStatus === 'loading' && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6" 
                     style={{ borderColor: '#00ffcc' }}></div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#00ffcc' }}>
                  🐛 Loading SonicWorm...
                </h3>
                <p className="text-gray-400">Initializing game engine</p>
              </div>
            </div>
          )}

          {/* NEW: Victory/Game Over Overlay */}
          {gameStatus === 'ended' && gameEndData && (
            <GameEndOverlay 
              isWinner={gameEndData.isWinner}
              prizeWon={gameEndData.prizeWon}
              onBackToMenu={onBackToMenu}
            />
          )}
        </div>

        {/* Game Instructions */}
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎮</span>
            How to Play SonicWorm
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-blue-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                🖱️
              </div>
              <span className="text-gray-300">Mouse/Touch for direction</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                ⌨️
              </div>
              <span className="text-gray-300">PC: Space key to boost</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                📱
              </div>
              <span className="text-gray-300">Mobile: Tap screen to boost</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-cyan-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                🍎
              </div>
              <span className="text-gray-300">Eat colored dots to grow</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-cyan-400 font-bold">
              🎯 Goal: Last survivor wins entire prize pool! Multi-survivor: ranking by kills
            </p>
            <p className="text-gray-400 text-sm mt-1">
              📱 Best played in landscape mode | 💻 Cross-platform compatible
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};