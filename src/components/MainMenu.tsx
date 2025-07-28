import React, { useState, useEffect } from 'react';

// Lobi bilgilerini tutacak arayüz
interface LobbyInfo {
  state: 'idle' | 'gathering' | 'waiting' | 'confirming';
  playerCount: number;
  maxPlayers: number;
  confirmedCount: number;
  timeRemaining: number;
}

// Bileşenin alacağı props'ların arayüzü
interface MainMenuProps {
  lobbyState: LobbyInfo | null;
  isGameActive: boolean;
  currentLives: number;
  onJoinLobby: () => void;
  onLeaveLobby: () => void;
  onConfirmJoin: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  lobbyState,
  isGameActive,
  currentLives,
  onJoinLobby,
  onLeaveLobby,
  onConfirmJoin,
}) => {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Lobi durumu değiştiğinde, oyuncunun onay durumunu sıfırla
  useEffect(() => {
    if (lobbyState?.state !== 'confirming') {
      setHasConfirmed(false);
    }
  }, [lobbyState]);

  const handleConfirmClick = () => {
    onConfirmJoin();
    setHasConfirmed(true);
  };

  // Oyuncunun bir lobide olup olmadığını kontrol et
  const isInLobby = !!(lobbyState && lobbyState.state !== 'idle');

  // Lobi durumu için arayüzü render et
  const renderLobbyUI = () => {
    // Lobi durumu yoksa veya 'idle' ise, hiçbir şey gösterme
    if (!isInLobby) {
      return null;
    }

    // Farklı lobi durumları için arayüzler
    switch (lobbyState.state) {
      case 'gathering':
        return (
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-gray-700 text-center">
            <div className="text-lg font-bold text-gray-300 mb-2">
              Waiting for players...
            </div>
            <div className="text-2xl font-bold text-white mb-4">
              {lobbyState.playerCount}/{lobbyState.maxPlayers}
            </div>
            <button
              onClick={onLeaveLobby}
              className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg"
            >
              Leave Queue
            </button>
          </div>
        );

      case 'waiting':
        return (
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-yellow-500/60 text-center">
            <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400">
                <span className="animate-pulse">⏳</span>
                <span className="font-bold">Game starting soon...</span>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {lobbyState.playerCount}/{lobbyState.maxPlayers} Players
            </div>
            <div className="text-lg font-mono text-yellow-300 mb-4">
              {Math.ceil(lobbyState.timeRemaining / 1000)}s
            </div>
            <button
              onClick={onLeaveLobby}
              className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg"
            >
              Leave Queue
            </button>
          </div>
        );

      case 'confirming':
        return (
          <div className="mt-4 p-4 rounded-xl bg-black/40 border border-green-500/60 text-center">
             <div className="flex items-center justify-center gap-2 mb-2 text-green-400">
                <span className="animate-pulse">🎯</span>
                <span className="font-bold">Match Found!</span>
            </div>
            <div className="text-lg font-bold text-white mb-2">
              {lobbyState.confirmedCount}/{lobbyState.playerCount} Confirmed
            </div>
            <div className="text-lg font-mono text-green-300 mb-4">
              {Math.ceil(lobbyState.timeRemaining / 1000)}s to confirm
            </div>
            <button
              onClick={handleConfirmClick}
              disabled={hasConfirmed}
              className="w-full py-3 px-6 rounded-lg font-bold text-lg transition-all hover:scale-105 bg-green-500 hover:bg-green-600 text-black shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {hasConfirmed ? 'WAITING FOR OTHERS...' : 'CONFIRM JOIN'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Ana Lobi Butonu */}
      <button
        onClick={onJoinLobby}
        disabled={isGameActive || isInLobby || (currentLives <= 0 && !isInLobby)}
        className="w-full py-4 px-8 rounded-xl font-bold text-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(45deg, #00ffcc, #10b981)',
          color: '#000000',
          boxShadow: '0 0 30px rgba(0,255,204,0.6)'
        }}
      >
        {isInLobby ? 'IN QUEUE...' :
         isGameActive ? 'GAME IN PROGRESS' : 
         currentLives <= 0 ? 'NO LIVES - BUY MORE' : 'JOIN LOBBY'}
      </button>

      {/* Lobi Durum Bilgisi */}
      {renderLobbyUI()}
    </div>
  );
};

export default MainMenu;
