import Phaser from 'phaser';
import { GameScene } from './GameScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container', // HTML element ID
  backgroundColor: '#1a1a2e',
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity for top-down game
      debug: false
    }
  },
  input: {
    mouse: {
      target: 'game-container'
    },
    touch: {
      target: 'game-container'
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 400,
      height: 300
    },
    max: {
      width: 1600,
      height: 1200
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

export class GameManager {
  private static instance: GameManager | null = null;
  private game: Phaser.Game | null = null;
  private gameScene: GameScene | null = null;
  private isInitializing: boolean = false;

  // Singleton pattern to prevent multiple instances
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  public startGame(containerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Prevent multiple simultaneous initializations
        if (this.isInitializing) {
          console.log('🎮 Game already initializing, waiting...');
          return reject(new Error('Game is already being initialized'));
        }

        // If game is already running, just resolve
        if (this.game && this.gameScene) {
          console.log('🎮 Game already running, skipping initialization');
          return resolve();
        }

        this.isInitializing = true;

        // Destroy existing game if any
        if (this.game) {
          console.log('🧹 Destroying existing game instance');
          this.game.destroy(true);
          this.game = null;
          this.gameScene = null;
        }

        // Update container ID
        const config = { ...gameConfig };
        config.parent = containerId;

        console.log('🎮 Starting SonicWorm game...');

        // Create game instance
        this.game = new Phaser.Game(config);

        // Wait for scene to be ready
        setTimeout(() => {
          try {
            this.gameScene = this.game!.scene.getScene('GameScene') as GameScene;
            
            if (this.gameScene) {
              // Setup game event listeners
              this.setupEventListeners();
              console.log('✅ SonicWorm game started successfully');
              this.isInitializing = false;
              resolve();
            } else {
              console.error('❌ GameScene not found');
              this.isInitializing = false;
              reject(new Error('GameScene not found'));
            }
          } catch (error) {
            console.error('❌ Failed to get GameScene:', error);
            this.isInitializing = false;
            reject(error);
          }
        }, 1000);

      } catch (error) {
        console.error('❌ Failed to start game:', error);
        this.isInitializing = false;
        reject(error);
      }
    });
  }

  // SERVER ID SYNC: Set player ID from server
  public setPlayerId(serverId: string): void {
    if (this.gameScene) {
      this.gameScene.setPlayerId(serverId);
    }
  }

  public destroyGame(): void {
    if (this.game) {
      console.log('🧹 Destroying game instance');
      this.game.destroy(true);
      this.game = null;
      this.gameScene = null;
      this.isInitializing = false;
      console.log('🎮 Game destroyed');
    }
  }

  public getGameScene(): GameScene | null {
    return this.gameScene;
  }

  public isGameRunning(): boolean {
    return this.game !== null && this.gameScene !== null;
  }

  public getPlayerKills(): number {
    return this.gameScene?.getPlayerKills() || 0;
  }

  public getGameTime(): number {
    return this.gameScene?.getGameTime() || 0;
  }

  public isPlayerAlive(): boolean {
    return this.gameScene?.isPlayerAlive() || false;
  }

  private setupEventListeners(): void {
    if (!this.gameScene) return;

    // SENİN KURALLARIN: Listen for player death
    this.gameScene.events.on('playerDied', (data: { kills: number; survivalTime: number }) => {
      console.log('🎯 Player died event:', data);
      
      // Emit to parent application (React component)
      window.dispatchEvent(new CustomEvent('gameEnded', {
        detail: {
          kills: data.kills,
          survivalTime: data.survivalTime,
          timestamp: Date.now()
        }
      }));
    });
  }

  // Game control methods
  public resetGame(): void {
    if (this.gameScene) {
      this.gameScene.resetPlayer();
    }
  }
}

// Singleton instance
export const gameManager = GameManager.getInstance();