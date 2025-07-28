// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SonicWormGame V2 - Improved Life Management (Simple Version)
 * @dev Can harcama sistemi oyun sırasında yapılır, lobby'de değil
 */
contract SonicWormGameV2Simple {

    // Events
    event LifePurchased(address indexed player, uint256 amount, uint256 cost);
    event GameReserved(address indexed player, uint256 gameId);
    event GameStarted(address indexed player, uint256 gameId);
    event GameEnded(address indexed player, uint256 gameId, uint256 kills, uint256 survivalTime, bool earnedReward);
    event PlayerKilled(address indexed killer, address indexed victim, uint256 gameId);
    event RewardClaimed(address indexed player, uint256 amount);
    
    // Safety Events
    event ContractPaused(uint256 timestamp);
    event ContractUnpaused(uint256 timestamp);
    event EmergencyStopActivated(uint256 timestamp);
    event EmergencyStopDeactivated(uint256 timestamp);
    event BatchResetExecuted(uint256 playerCount, uint256 timestamp);
    event NewContractAddressSet(address indexed newAddress, uint256 timestamp);
    event PlayerMigrated(address indexed player, uint256 timestamp);

    // Player statistics
    struct Player {
        uint256 lives;
        uint256 totalGamesPlayed;
        uint256 totalKills;
        uint256 totalSurvivalTime;
        uint256 totalRewards;
        uint256 lastLifeRefill;
        bool isActive;
        bool isRegistered;
        uint256 currentGameId;
    }

    // Game session data
    struct Game {
        address player;
        uint256 startTime;
        uint256 endTime;
        uint256 kills;
        uint256 survivalTime;
        bool earnedReward;
        bool isCompleted;
        bool rewardClaimed;
        bool lifeConsumed;  // Can harcanmış mı?
        bool isReserved;    // Sadece rezerve mi?
    }

    // State variables - 4 CÜZDAN SİSTEMİ
    address payable public prizePoolWallet;     // %60 - Oyun ödülleri için
    address payable public weeklyRewardPool;    // %20 - Haftalık ödüller için  
    address payable public developerFund;       // %15 - Geliştirici fonu için
    address payable public liquidityFund;       // %5 - Likidite fonu için
    address public owner;
    address public server;
    
    // Safety Controls
    bool public paused = false;
    bool public emergencyStop = false;
    address public newContractAddress;

    uint256 public constant PRIZE_POOL_PERCENT = 60;    // %60 oyun ödülleri
    uint256 public constant WEEKLY_POOL_PERCENT = 20;   // %20 haftalık ödüller
    uint256 public constant DEVELOPER_FUND_PERCENT = 15; // %15 geliştirici
    uint256 public constant LIQUIDITY_FUND_PERCENT = 5;  // %5 likidite
    uint256 public constant MAX_LIVES = 3;

    mapping(address => Player) public players;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public pendingRewards;
    
    uint256 public gameCounter;
    uint256 public lifePrice = 5 ether;
    uint256 public rewardPool;
    uint256 public totalPlayers;
    address[] public playerList;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyServer() {
        require(msg.sender == server, "Only server");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier whenNotEmergency() {
        require(!emergencyStop, "Contract is in emergency mode");
        _;
    }

    constructor() {
        owner = msg.sender;
        gameCounter = 0;
        rewardPool = 0;
        totalPlayers = 0;
    }

    /**
     * @dev Buy lives
     */
    function buyLives(uint256 amount) external payable whenNotPaused whenNotEmergency {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_LIVES, "Cannot buy more than max lives");
        Player storage player = players[msg.sender];
        require(player.lives + amount <= MAX_LIVES, "Would exceed max lives");
        uint256 totalCost = lifePrice * amount;
        require(msg.value >= totalCost, "Insufficient payment");

        // YENİ 4 CÜZDAN DAĞITIM SİSTEMİ
        uint256 payment = msg.value;
        uint256 prizePoolAmount = (payment * PRIZE_POOL_PERCENT) / 100;     // %60 = 3 S
        uint256 weeklyAmount = (payment * WEEKLY_POOL_PERCENT) / 100;       // %20 = 1 S  
        uint256 developerAmount = (payment * DEVELOPER_FUND_PERCENT) / 100; // %15 = 0.75 S
        uint256 liquidityAmount = (payment * LIQUIDITY_FUND_PERCENT) / 100; // %5 = 0.25 S

        // Otomatik dağıtım - Her cüzdan kendi payını alır
        if (prizePoolWallet != address(0)) {
            prizePoolWallet.transfer(prizePoolAmount);
        }
        if (weeklyRewardPool != address(0)) {
            weeklyRewardPool.transfer(weeklyAmount);
        }
        if (developerFund != address(0)) {
            developerFund.transfer(developerAmount);
        }
        if (liquidityFund != address(0)) {
            liquidityFund.transfer(liquidityAmount);
        }

        // Prize pool artık ayrı cüzdanda tutuluyor
        // rewardPool sadece statistics için kullanılıyor
        rewardPool = rewardPool + prizePoolAmount;

        if (!player.isRegistered) {
            player.isRegistered = true;
            totalPlayers = totalPlayers + 1;
            playerList.push(msg.sender);
        }
        
        player.lives = player.lives + amount;

        // Refund excess
        if (payment > totalCost) {
            uint256 refundAmount = payment - totalCost;
            payable(msg.sender).transfer(refundAmount);
        }
        
        emit LifePurchased(msg.sender, amount, totalCost);
    }

    /**
     * @dev Reserve game slot - CAN HARCAMADAN gameId al
     */
    function reserveGame() external whenNotPaused whenNotEmergency returns (uint256) {
        Player storage player = players[msg.sender];
        require(player.isRegistered, "Player not registered");
        require(player.lives > 0, "No lives remaining");
        require(!player.isActive, "Already have active/reserved game");

        gameCounter = gameCounter + 1;
        uint256 newGameId = gameCounter;
        player.currentGameId = newGameId;
        player.isActive = true;

        games[newGameId] = Game({
            player: msg.sender,
            startTime: 0,
            endTime: 0,
            kills: 0,
            survivalTime: 0,
            earnedReward: false,
            isCompleted: false,
            rewardClaimed: false,
            lifeConsumed: false,
            isReserved: true
        });

        emit GameReserved(msg.sender, newGameId);
        return newGameId;
    }

    /**
     * @dev Start match for multiple players - Server only
     */
    function startMatch(address[] calldata _players, uint256[] calldata _gameIds) external onlyServer {
        require(_players.length >= 2, "At least 2 players required");
        require(_players.length == _gameIds.length, "Arrays length mismatch");

        for (uint i = 0; i < _players.length; i++) {
            address playerAddress = _players[i];
            uint256 gameId = _gameIds[i];
            
            Game storage game = games[gameId];
            Player storage player = players[playerAddress];

            require(game.player == playerAddress, "Game not owned by player");
            require(game.isReserved, "Game not reserved");
            require(!game.lifeConsumed, "Life already consumed");
            require(player.lives > 0, "Player has no lives");
        
            // ŞİMDİ can harca
            player.lives = player.lives - 1;
            player.totalGamesPlayed = player.totalGamesPlayed + 1;
            
            game.startTime = block.timestamp;
            game.lifeConsumed = true;
            game.isReserved = false;
        
            emit GameStarted(playerAddress, gameId);
        }
    }

    /**
     * @dev End a game
     */
    function endGame(uint256 gameId) external whenNotPaused {
        Game storage game = games[gameId];
        Player storage player = players[msg.sender];
        
        require(game.player == msg.sender, "Not your game");
        require(!game.isCompleted, "Game already completed");
        require(player.currentGameId == gameId, "Not your current game");

        game.isCompleted = true;
        game.endTime = block.timestamp;
        if (game.startTime > 0) {
            game.survivalTime = game.endTime - game.startTime;
        }
        
        player.totalSurvivalTime = player.totalSurvivalTime + game.survivalTime;
        player.isActive = false;
        player.currentGameId = 0;

        emit GameEnded(msg.sender, gameId, game.kills, game.survivalTime, game.earnedReward);
    }

    /**
     * @dev Cancel reserved game
     */
    function cancelReservedGame(uint256 gameId) external whenNotPaused {
        Game storage game = games[gameId];
        Player storage player = players[msg.sender];
        
        require(game.player == msg.sender, "Not your game");
        require(game.isReserved, "Game not reserved");
        require(!game.lifeConsumed, "Life already consumed");
        require(player.currentGameId == gameId, "Not your current game");

        game.isCompleted = true;
        game.endTime = block.timestamp;
        
        player.isActive = false;
        player.currentGameId = 0;

        emit GameEnded(msg.sender, gameId, 0, 0, false);
    }

    /**
     * @dev Record kill - Server only
     */
    function recordKill(uint256 gameId, address victim) external onlyServer {
        Game storage game = games[gameId];
        address killer = game.player;

        require(game.startTime > 0, "Game not started");
        require(!game.isCompleted, "Game already completed");
        require(killer != victim, "Cannot kill yourself");
        
        game.kills++;
        players[killer].totalKills++;
        
        emit PlayerKilled(killer, victim, gameId);
    }

    /**
     * @dev Emergency reset
     */
    function emergencyResetMyStatus() external whenNotPaused {
        Player storage player = players[msg.sender];
        require(player.isActive, "Player is not active");
        
        if (player.currentGameId > 0) {
            Game storage game = games[player.currentGameId];
            if (game.lifeConsumed && game.startTime > 0) {
                require(game.isCompleted || block.timestamp > game.startTime + 300, 
                       "Game is active (wait 5 minutes)");
            }
        }
        
        player.isActive = false;
        player.currentGameId = 0;
    }

    // View functions
    function getPlayer(address playerAddress) external view returns (Player memory) {
        return players[playerAddress];
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getPlayerCount() external view returns (uint256) {
        return playerList.length;
    }

    function getPlayerAddressByIndex(uint256 index) external view returns (address) {
        return playerList[index];
    }

    function getPendingRewards(address playerAddress) external view returns (uint256) {
        return pendingRewards[playerAddress];
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards() external {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        pendingRewards[msg.sender] = 0;
        players[msg.sender].totalRewards += reward;
        
        payable(msg.sender).transfer(reward);
        
        emit RewardClaimed(msg.sender, reward);
    }

    /**
     * @dev Distributes prizes to winners at the end of a game. Only callable by the server.
     * @param winners An array of winner addresses.
     * @param amounts An array of prize amounts corresponding to each winner.
     */
    function distributePrizes(address[] calldata winners, uint256[] calldata amounts) external onlyServer {
        require(winners.length == amounts.length, "Winners and amounts arrays must have the same length");
        
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalPayout += amounts[i];
        }

        require(rewardPool >= totalPayout, "Insufficient reward pool balance for this payout");

        rewardPool -= totalPayout;

        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0) {
                // Ödülü pending rewards'a ekle, direkt transfer etme
                pendingRewards[winners[i]] += amounts[i];
            }
        }
    }

    // Admin functions
    function setPrizePoolWallet(address payable _address) external onlyOwner {
        prizePoolWallet = _address;
    }
    
    function setWeeklyRewardPool(address payable _address) external onlyOwner {
        weeklyRewardPool = _address;
    }

    function setDeveloperFund(address payable _address) external onlyOwner {
        developerFund = _address;
    }

    function setLiquidityFund(address payable _address) external onlyOwner {
        liquidityFund = _address;
    }

    function setLifePrice(uint256 newPrice) external onlyOwner {
        lifePrice = newPrice;
    }

    function setServer(address _server) external onlyOwner {
        server = _server;
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // ===== SAFETY FEATURES =====
    
    /**
     * @dev Pause contract - stops all user interactions
     */
    function pauseContract() external onlyOwner {
        paused = true;
        emit ContractPaused(block.timestamp);
    }
    
    function unpauseContract() external onlyOwner {
        paused = false;
        emit ContractUnpaused(block.timestamp);
    }
    
    /**
     * @dev Emergency stop - more severe than pause
     */
    function activateEmergencyStop() external onlyOwner {
        emergencyStop = true;
        emit EmergencyStopActivated(block.timestamp);
    }
    
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
        emit EmergencyStopDeactivated(block.timestamp);
    }
    
    /**
     * @dev Batch reset multiple players at once
     */
    function batchResetPlayers(address[] calldata playerAddresses) external onlyOwner {
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            Player storage player = players[playerAddresses[i]];
            if (player.isActive) {
                player.isActive = false;
                player.currentGameId = 0;
            }
        }
        emit BatchResetExecuted(playerAddresses.length, block.timestamp);
    }
    
    /**
     * @dev Contract upgrade preparation
     */
    function setNewContractAddress(address _newAddress) external onlyOwner {
        newContractAddress = _newAddress;
        emit NewContractAddressSet(_newAddress, block.timestamp);
    }
    
    function migratePlayer(address playerAddress) external onlyOwner {
        require(newContractAddress != address(0), "New contract address not set");
        Player storage player = players[playerAddress];
        require(player.isRegistered, "Player not registered");
        
        // Mark as migrated (could be used to prevent double migration)
        emit PlayerMigrated(playerAddress, block.timestamp);
    }

    /**
     * @dev Admin emergency reset - Reset all stuck players
     */
    function adminEmergencyResetAll() external onlyOwner {
        for (uint256 i = 0; i < playerList.length; i++) {
            address playerAddress = playerList[i];
            Player storage player = players[playerAddress];
            
            if (player.isActive) {
                player.isActive = false;
                player.currentGameId = 0;
            }
        }
    }

    /**
     * @dev Admin emergency reset specific player
     */
    function adminEmergencyResetPlayer(address playerAddress) external onlyOwner {
        Player storage player = players[playerAddress];
        require(player.isActive, "Player is not active");
        
        player.isActive = false;
        player.currentGameId = 0;
    }
}