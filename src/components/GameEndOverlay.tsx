import React, { useEffect, useState } from 'react';

interface GameEndOverlayProps {
  isWinner: boolean;
  prizeWon: number;
  onBackToMenu?: () => void;
}

export const GameEndOverlay: React.FC<GameEndOverlayProps> = ({
  isWinner,
  prizeWon,
  onBackToMenu
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 5 saniye countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Otomatik menüye dön
          onBackToMenu?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onBackToMenu]);

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
      <div className="text-center text-white bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl border border-cyan-500/30 max-w-md">
        <div className="mb-6">
          <img 
            src="/sonicworm-logo.svg" 
            alt="SonicWorm" 
            className="w-20 h-20 mx-auto"
            style={{ filter: 'drop-shadow(0 0 15px #00ffcc)' }}
          />
        </div>
        
        {isWinner ? (
          <>
            <h3 className="text-3xl font-bold mb-4" style={{ color: '#00ffcc' }}>
              🏆 VICTORY!
            </h3>
            <div className="bg-yellow-500/20 rounded-lg p-4 mb-6">
              {prizeWon > 0 ? (
                <>
                  <p className="text-yellow-400 text-xl font-bold">
                    🎉 Prize Won: {prizeWon.toFixed(2)} S
                  </p>
                  <p className="text-yellow-300 text-sm mt-2">
                    💰 Automatically transferred to your wallet!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-cyan-400 text-xl font-bold">
                    🎯 Top 3 Survivor!
                  </p>
                  <p className="text-cyan-300 text-sm mt-2">
                    🏆 You finished in the top 3 survivors!
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-3xl font-bold mb-4" style={{ color: '#ff6b6b' }}>
              💀 GAME OVER
            </h3>
            <div className="bg-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-lg">
                Better luck next time!
              </p>
              <p className="text-gray-300 text-sm mt-2">
                💡 Survive and rank in top 3 to win!
              </p>
            </div>
          </>
        )}
        
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">
            Returning to menu in <span className="text-cyan-400 font-bold text-lg">{countdown}</span> seconds...
          </p>
        </div>
        
        <button
          onClick={onBackToMenu}
          className="px-6 py-3 rounded-lg font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}
        >
          🏠 Back to Menu Now
        </button>
      </div>
    </div>
  );
};