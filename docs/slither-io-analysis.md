# Slither.io Oyun Analizi ve Sonic Snake Uyarlaması

## Slither.io Temel Mekaniği

### 1. Oyun Kuralları
- **Başlangıç**: Küçük yılan olarak başla
- **Hareket**: Mouse ile yön kontrolü, sürekli hareket
- **Büyüme**: Renkli noktaları ye → uzun ol
- **Ölüm**: Başka yılana çarp → öl ve parçalara ayrıl
- **Kazanma**: Diğer yılanları öldür → onların parçalarını ye
- **Boost**: Mouse click ile hızlan (ama küçül)

### 2. Oyun Mekaniği Detayları

#### Hareket Sistemi
```javascript
// Temel hareket mekaniği
player.angle = Phaser.Math.Angle.Between(player.x, player.y, mouseX, mouseY);
player.x += Math.cos(player.angle) * player.speed;
player.y += Math.sin(player.angle) * player.speed;
```

#### Büyüme Sistemi
- Her yenen nokta = +1 segment
- Segment = yılanın vücut parçası
- Uzunluk arttıkça hareket zorlaşır
- Maksimum uzunluk limiti yok

#### Çarpışma Sistemi
- Kafa başka yılana değerse → ölüm
- Vücut parçaları zararsız
- Kendi vücuduna çarpamazsın
- Harita sınırları yok (sonsuz alan)

#### Boost Sistemi
- Mouse basılı tut = 2x hız
- Boost yaparken uzunluk azalır
- Çok kısa yılanlar boost yapamaz

### 3. Multiplayer Yapısı

#### Client-Server Architecture
```
Client (Browser) ←→ WebSocket Server ←→ Other Clients
     ↓                    ↓                   ↓
  Local Game         Game State          Local Game
  Prediction         Authority           Prediction
```

#### State Synchronization
- Server: Authoritative game state
- Client: Predictive rendering
- Interpolation: Smooth movement
- Lag compensation: Input prediction

## Sonic Snake Uyarlaması

### 1. Temel Oyun Döngüsü

```
1. Oyuncu cüzdan bağlar
2. Can kontrolü (3/3 can var mı?)
3. Can yoksa → Sonic token ile satın al
4. Oyuna gir (1 can harca)
5. Multiplayer arena'da oyna
6. Öl veya kazanırsan → skor kaydet
7. Skor bazlı ödül hesapla
8. Ödülü blockchain'e kaydet
9. Oyuncu ödülü claim edebilir
```

### 2. Blockchain Entegrasyonu Noktaları

#### Oyun Başlangıcı (On-Chain)
```solidity
function startGame() external {
    require(players[msg.sender].lives > 0, "No lives");
    players[msg.sender].lives--;
    
    uint256 gameId = ++gameCounter;
    games[gameId] = Game({
        player: msg.sender,
        startTime: block.timestamp,
        isActive: true
    });
    
    emit GameStarted(msg.sender, gameId);
}
```

#### Oyun Sonu (On-Chain)
```solidity
function endGame(uint256 gameId, uint256 score, bytes calldata proof) external {
    Game storage game = games[gameId];
    require(game.player == msg.sender, "Not your game");
    require(game.isActive, "Game not active");
    
    // Anti-cheat: Score validation
    require(_validateScore(score, proof), "Invalid score");
    
    game.score = score;
    game.endTime = block.timestamp;
    game.isActive = false;
    
    // Reward calculation
    uint256 reward = _calculateReward(score);
    pendingRewards[msg.sender] += reward;
    
    emit GameEnded(msg.sender, gameId, score, reward);
}
```

### 3. Güvenlik Önlemleri

#### Anti-Cheat Sistemi
1. **Score Validation**: Cryptographic proof
2. **Time Validation**: Minimum oyun süresi
3. **Rate Limiting**: Spam prevention
4. **Server Authority**: Final validation

#### Smart Contract Güvenliği
1. **Reentrancy Protection**: OpenZeppelin guards
2. **Access Control**: Role-based permissions
3. **Pausable**: Emergency stop
4. **Upgradeable**: Future improvements

### 4. Teknik Implementasyon

#### Frontend Stack
```
React App
├── Game Component (Phaser.js canvas)
├── Wallet Component (Web3 connection)
├── UI Components (Lives, Score, Leaderboard)
└── Web3 Hooks (Contract interactions)
```

#### Game Engine (Phaser.js)
```javascript
class GameScene extends Phaser.Scene {
    create() {
        // Initialize game world
        this.setupPlayer();
        this.setupFood();
        this.setupMultiplayer();
        this.setupUI();
    }
    
    update() {
        this.handleInput();
        this.updatePlayer();
        this.checkCollisions();
        this.syncWithServer();
    }
}
```

#### Multiplayer Networking
```javascript
// WebSocket connection
const socket = new WebSocket('wss://game-server.com');

// Send player input
socket.send(JSON.stringify({
    type: 'PLAYER_INPUT',
    angle: playerAngle,
    boost: isBoostActive
}));

// Receive game state
socket.onmessage = (event) => {
    const gameState = JSON.parse(event.data);
    updateGameWorld(gameState);
};
```

## Geliştirme Aşamaları

### Phase 1: Temel Oyun (Offline)
- [x] Proje yapısı
- [ ] Phaser.js setup
- [ ] Temel yılan mekaniği
- [ ] Hareket sistemi
- [ ] Yem sistemi
- [ ] Çarpışma detection

### Phase 2: Web3 Entegrasyonu
- [ ] Wallet connection
- [ ] Smart contract deployment
- [ ] Can sistemi
- [ ] Oyun başlatma/bitirme

### Phase 3: Multiplayer
- [ ] WebSocket server
- [ ] Real-time synchronization
- [ ] Anti-cheat sistemi
- [ ] Leaderboard

### Phase 4: Optimizasyon
- [ ] Performance tuning
- [ ] Security audit
- [ ] UI/UX polish
- [ ] Mobile optimization

## Kritik Kararlar

### 1. Oyun Süresi
- **Öneri**: 3-5 dakika maksimum
- **Neden**: Kısa oyunlar = daha fazla engagement
- **Blockchain**: Daha az gas fee

### 2. Arena Boyutu
- **Öneri**: 2000x2000 pixel
- **Oyuncu Sayısı**: 20-30 kişi
- **Yem Miktarı**: 500-1000 adet

### 3. Skor Sistemi
- **Temel Skor**: Yenen yem sayısı
- **Bonus**: Öldürülen yılan sayısı x10
- **Survival Bonus**: Oyun sonu hayatta kalma

### 4. Ödül Sistemi
```solidity
function calculateReward(uint256 score) internal pure returns (uint256) {
    if (score < 10) return 0;
    if (score < 50) return 0.001 ether;
    if (score < 100) return 0.005 ether;
    if (score < 200) return 0.01 ether;
    return 0.02 ether; // Maximum reward
}
```

## Sonraki Adım

Hangi aşamadan başlamak istiyorsun?

1. **Temel Phaser.js oyunu** (offline, tek oyuncu)
2. **Smart contract detayları** (can sistemi, ödül mekaniği)
3. **Web3 entegrasyonu** (wallet bağlantısı)
4. **Multiplayer server** (WebSocket, real-time)

Ben önce **temel oyunu** yapmayı öneriyorum. Çünkü oyun mekaniği çalışmadan blockchain entegrasyonu anlamsız olur.