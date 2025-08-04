// SENİN KURALLARIN: Multiplayer WebSocket Service
export interface PlayerData {
  id: string;
  x: number;
  y: number;
  angle: number;
  segments: Array<{ x: number; y: number }>;
  kills: number;
  isAlive: boolean;
  color: number;
  spawnTime: number; // Spawn zamanı
  isInvulnerable: boolean; // İlk 20 saniye öldürülemez
  playerName?: string; // Opsiyonel oyuncu adı
}

export interface GameState {
  players: PlayerData[];
  food: Array<{
    id: string;
    x: number;
    y: number;
    color: number;
    size: number;
  }>;
  isActive: boolean;
  startTime?: number; // Server'dan gelen start time
  timeRemaining: number;
}

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  // Event callbacks
  private onGameJoined: ((playerId: string, roomId: string, gameState: GameState) => void) | null = null;
  private onPlayerUpdate: ((playerId: string, playerData: Partial<PlayerData>) => void) | null = null;
  private onPlayerKilled: ((killerId: string, victimId: string, gameState: GameState) => void) | null = null;
  private onGameState: ((gameState: GameState) => void) | null = null;
  private onPlayerJoined: ((player: PlayerData) => void) | null = null;
  private onPlayerLeft: ((playerId: string) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onLifeRefunded: ((data: any) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private onMatchStarting: (() => void) | null = null;
  private onLobbyStatus: ((status: { players: number; maxPlayers: number; timeRemaining: number }) => void) | null = null;
  private onGameStarted: (() => void) | null = null;

  constructor(private serverUrl: string = 'wss://sonicworm-server-production.up.railway.app') {}

  // Event listeners
  public setOnGameJoined(callback: (playerId: string, roomId: string, gameState: GameState) => void) {
    this.onGameJoined = callback;
  }

  public setOnPlayerUpdate(callback: (playerId: string, playerData: Partial<PlayerData>) => void) {
    this.onPlayerUpdate = callback;
  }

  public setOnPlayerKilled(callback: (killerId: string, victimId: string, gameState: GameState) => void) {
    this.onPlayerKilled = callback;
  }

  public setOnGameState(callback: (gameState: GameState) => void) {
    this.onGameState = callback;
  }

  public setOnPlayerJoined(callback: (player: PlayerData) => void) {
    this.onPlayerJoined = callback;
  }

  public setOnPlayerLeft(callback: (playerId: string) => void) {
    this.onPlayerLeft = callback;
  }

  public setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  public setOnLifeRefunded(callback: (data: any) => void) {
    this.onLifeRefunded = callback;
  }

  public setOnConnectionChange(callback: (connected: boolean) => void) {
    this.onConnectionChange = callback;
  }

  public setOnMatchStarting(callback: () => void) {
    this.onMatchStarting = callback;
  }

  public setOnLobbyStatus(callback: (status: { players: number; maxPlayers: number; timeRemaining: number }) => void) {
    this.onLobbyStatus = callback;
  }

  public setOnGameStarted(callback: () => void) {
    this.onGameStarted = callback;
  }

  // NEW: Real-time game data callbacks
  private onGameStateUpdate: ((data: any) => void) | null = null;
  private onTimerUpdate: ((data: any) => void) | null = null;

  public setOnGameStateUpdate(callback: (data: any) => void) {
    this.onGameStateUpdate = callback;
  }

  public setOnTimerUpdate(callback: (data: any) => void) {
    this.onTimerUpdate = callback;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('🔗 Connected to multiplayer server');
          this.reconnectAttempts = 0;
          this.onConnectionChange?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Received message:', data);
            // Call handler
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from multiplayer server');
          this.onConnectionChange?.(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onError?.('Connection error');
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'GAME_JOINED':
        this.playerId = data.playerId;
        this.roomId = data.roomId;
        this.onGameJoined?.(data.playerId, data.roomId, data.gameState);
        break;

      case 'PLAYER_UPDATE':
        this.onPlayerUpdate?.(data.playerId, data.playerData);
        break;

      case 'PLAYER_KILLED':
        this.onPlayerKilled?.(data.killerId, data.victimId, data.gameState);
        // Dispatch player killed event
        window.dispatchEvent(new CustomEvent('playerKilled', {
          detail: {
            message: data.message
          }
        }));
        // Dispatch updated game data
        window.dispatchEvent(new CustomEvent('gameStateUpdated', {
          detail: {
            players: data.players,
            connectedCount: data.connectedCount,
            prizePool: data.prizePool,
            gameState: data.gameState
          }
        }));
        break;

      case 'GAME_STATE':
        this.onGameState?.(data.gameState);
        break;
      case 'GAME_STATE_UPDATE':
        this.onGameStateUpdate?.(data);
        // Dispatch to components
        window.dispatchEvent(new CustomEvent('gameStateUpdated', {
          detail: data
        }));
        break;
      case 'TIMER_UPDATE':
        this.onTimerUpdate?.(data);
        // Dispatch timer update to components
        window.dispatchEvent(new CustomEvent('timeUpdated', {
          detail: { 
            time: data.elapsedTime,
            timeRemaining: data.timeRemaining 
          }
        }));
        break;
      
      case 'GAME_ENDED':
        // NEW: Handle server game end event
        window.dispatchEvent(new CustomEvent('gameEnded', {
          detail: {
            finalLeaderboard: data.finalLeaderboard,
            players: data.players,
            prizePool: data.prizePool,
            gameState: data.gameState
          }
        }));
        break;

      case 'PLAYER_JOINED':
        this.onPlayerJoined?.(data.player);
        break;

      case 'PLAYER_LEFT':
        this.onPlayerLeft?.(data.playerId);
        break;

      case 'ERROR':
        this.onError?.(data.message);
        break;

      case 'PONG':
        // Ping response - connection is alive
        break;

      case 'MATCH_STARTING':
        this.onMatchStarting?.();
        break;

      case 'LOBBY_STATUS':
        this.onLobbyStatus?.(data);
        break;

      case 'LOBBY_UPDATE':
        console.log('🔄 LOBBY_UPDATE received:', data);
        this.onLobbyStatus?.(data);
        break;

      case 'GAME_STARTED':
        this.onGameStarted?.();
        break;

      case 'LIFE_REFUNDED':
        console.log('💰 Life refunded:', data.message);
        this.onLifeRefunded?.(data); // Can iade callback'i çağır
        this.onError?.(data.message); // Kullanıcıya bilgi ver
        break;

      case 'MATCH_CANCELED':
        console.log('❌ Match canceled:', data.message);
        this.onError?.(data.message); // Kullanıcıya bilgi ver
        // Lobby state'ini sıfırla - kullanıcı yeniden join etmeli
        this.onLobbyStatus?.({ players: 0, maxPlayers: 0, timeRemaining: 0 });
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will try again
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.onError?.('Connection lost. Please refresh the page.');
    }
  }

  public joinLobby(playerData: Partial<PlayerData> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("Sunucuya bağlı değilken lobiye katılmaya çalışıldı.");
      throw new Error('Not connected to server');
    }
    this.send({
      type: 'JOIN_LOBBY',
      playerData: playerData // Gelen playerData'yı doğrudan gönder
    });
  }

  public confirmJoin() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    this.send({
      type: 'CONFIRM_JOIN'
    });
  }

  public async leaveLobby() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    // ✅ Client-side blockchain call: Cancel reserved game with player's own wallet
    try {
      const { web3Service } = await import('./Web3Service');
      const currentGameId = web3Service.getCurrentGameId();
      
      if (currentGameId) {
        console.log(`🔄 Canceling reserved game ${currentGameId} from client...`);
        await web3Service.cancelReservedGame(currentGameId);
        console.log(`✅ Reserved game ${currentGameId} canceled successfully`);
      }
    } catch (error: any) {
      console.error('❌ Failed to cancel reserved game:', error.message);
      // Fallback: Try emergency reset
      try {
        const { web3Service } = await import('./Web3Service');
        console.log('🚨 Trying emergency reset as fallback...');
        await web3Service.emergencyResetMyStatus();
        console.log('✅ Emergency reset successful');
      } catch (emergencyError: any) {
        console.error('❌ Emergency reset also failed:', emergencyError.message);
      }
    }

    // Send leave lobby message to server
    this.send({
      type: 'LEAVE_LOBBY'
    });
  }

  public joinGame(playerData: Partial<PlayerData> = {}, walletAddress?: string, gameId?: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    this.send({
      type: 'JOIN_GAME',
      playerData: {
        ...playerData,
        walletAddress,
        gameId
      }
    });
  }

  public updatePlayer(playerData: Partial<PlayerData>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.send({
      type: 'PLAYER_UPDATE',
      playerData
    });
  }

  public recordKill(victimId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.send({
      type: 'PLAYER_KILL',
      victimId
    });
  }

  public ping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.send({
      type: 'PING',
      timestamp: Date.now()
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.playerId = null;
    this.roomId = null;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public addMessageListener(listener: (event: MessageEvent) => void) {
    if (this.ws) {
      this.ws.addEventListener('message', listener);
    }
  }

  public removeMessageListener(listener: (event: MessageEvent) => void) {
    if (this.ws) {
      this.ws.removeEventListener('message', listener);
    }
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();