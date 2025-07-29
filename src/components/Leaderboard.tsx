import React, { useState, useEffect } from 'react';
import { web3Service, PlayerStats } from '../services/Web3Service';

interface LeaderboardEntry {
  id: string;
  playerName: string;
  walletAddress: string;
  points: number;
  totalKills: number;
  totalGames: number;
  bestKills: number;
  totalSurvivalTime: number;
  lastPlayed: number;
}

interface LeaderboardProps {
  currentPlayer?: {
    kills: number;
    survivalTime: number;
    walletAddress: string;
  };
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ currentPlayer }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data: PlayerStats[] = await web3Service.getLeaderboardData();
        // Map PlayerStats to LeaderboardEntry
        const mapped = data.map((stats, i) => ({
          id: stats.isActive ? String(i) : 'inactive',
          playerName: '0x' + Math.random().toString(16).slice(2, 8), // İsim yoksa wallet kısaltması veya rastgele
          walletAddress: '', // Gerçek adresi Web3Service'ten almak için eklenmeli
          points: stats.totalKills, // veya başka bir puanlama
          totalKills: stats.totalKills,
          totalGames: stats.totalGamesPlayed,
          bestKills: stats.totalKills, // veya başka bir değer
          totalSurvivalTime: stats.totalSurvivalTime,
          lastPlayed: Date.now() // Kontratta yoksa şimdilik şimdi
        }));
        setLeaderboardData(mapped);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [timeFilter]);

  const calculatePoints = (kills: number, _survivalTime: number): number => {
    // NEW SYSTEM: Prize pool based scoring
    // Points = kills (more kills = higher rank)
    return kills;
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="sonicworm-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(45deg, #00ffcc, #00ddaa)' }}>
            <span className="flex items-center justify-center w-full h-full text-sm font-bold text-black">🏆</span>
          </div>
          <h2 className="text-2xl font-bold sonicworm-text-glow" style={{ color: '#00ffcc' }}>
            Leaderboard
          </h2>
        </div>
        
        {/* Time Filter */}
        <div className="flex gap-2">
          {(['all', 'daily', 'weekly'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                timeFilter === filter
                  ? 'sonicworm-btn'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge Info */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.3)' }}>
        <h3 className="text-lg font-bold mb-2" style={{ color: '#00ffcc' }}>🎯 Challenge Rules</h3>
        <p className="text-gray-300 text-sm">
          <strong>1 Point</strong> = Kill 5+ players AND survive 5+ minutes in a single game
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Both conditions must be met to earn a point!
        </p>
      </div>

      {/* Current Player Stats */}
      {currentPlayer && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(0, 221, 170, 0.1)', border: '1px solid rgba(0, 221, 170, 0.3)' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#00ddaa' }}>Your Current Game</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#00ffcc' }}>{currentPlayer.kills}</div>
              <div className="text-xs text-gray-400">Kills</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#00ffcc' }}>
                {formatTime(currentPlayer.survivalTime)}
              </div>
              <div className="text-xs text-gray-400">Survival Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#00ffcc' }}>
                {calculatePoints(currentPlayer.kills, currentPlayer.survivalTime)}
              </div>
              <div className="text-xs text-gray-400">Points</div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4" style={{ border: '2px solid #00ffcc', borderTop: '2px solid transparent' }}></div>
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        ) : (
          leaderboardData.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 rounded-lg transition-all hover:bg-gray-700"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold w-12 text-center">
                  {getRankIcon(index + 1)}
                </div>
                
                <div>
                  <div className="font-bold text-white">{entry.playerName}</div>
                  <div className="text-xs text-gray-400">
                    {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-2xl" style={{ color: '#00ffcc' }}>
                    {entry.points}
                  </div>
                  <div className="text-xs text-gray-400">Points</div>
                </div>
                
                <div className="text-center">
                  <div className="font-bold text-white">{entry.totalKills}</div>
                  <div className="text-xs text-gray-400">Total Kills</div>
                </div>
                
                <div className="text-center">
                  <div className="font-bold text-white">{entry.bestKills}</div>
                  <div className="text-xs text-gray-400">Best Kills</div>
                </div>
                
                <div className="text-center">
                  <div className="font-bold text-white">{entry.totalGames}</div>
                  <div className="text-xs text-gray-400">Games</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400">{formatTimeAgo(entry.lastPlayed)}</div>
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
  );
};