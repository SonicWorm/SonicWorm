import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("SonicWormGame (NFT-free)", function () {
  let game: Contract;
  let owner: Signer;
  let player: Signer;
  let other: Signer;

  beforeEach(async () => {
    [owner, player, other] = await ethers.getSigners();
    const Game = await ethers.getContractFactory("SonicWormGame");
    game = await Game.deploy();
    await game.deployed();
  });

  it("should allow player to buy lives", async () => {
    const price = await game.lifePrice();
    await expect(game.connect(player).buyLives(2, { value: price.mul(2) }))
      .to.emit(game, "LifePurchased")
      .withArgs(await player.getAddress(), 2, price.mul(2));
    const playerData = await game.getPlayer(await player.getAddress());
    expect(playerData.lives).to.equal(2);
  });

  it("should not allow buying more than max lives", async () => {
    const price = await game.lifePrice();
    await expect(game.connect(player).buyLives(4, { value: price.mul(4) }))
      .to.be.revertedWith("Cannot buy more than max lives");
  });

  it("should start a game and decrease lives", async () => {
    const price = await game.lifePrice();
    await game.connect(player).buyLives(3, { value: price.mul(3) });
    await expect(game.connect(player).startGame())
      .to.emit(game, "GameStarted");
    const playerData = await game.getPlayer(await player.getAddress());
    expect(playerData.lives).to.equal(2);
  });

  it("should calculate only kill rewards if <5 kills and <5min", async () => {
    const price = await game.lifePrice();
    await game.connect(player).buyLives(1, { value: price });
    const tx = await game.connect(player).startGame();
    const receipt = await tx.wait();
    const gameId = receipt.events.find(e => e.event === "GameStarted").args.gameId;
    // Simulate 4 kills, 2 minutes
    await ethers.provider.send("evm_increaseTime", [2 * 60]);
    await ethers.provider.send("evm_mine", []);
    await expect(game.connect(player).endGame(gameId, 4))
      .to.emit(game, "GameEnded");
    const pending = await game.getPendingRewards(await player.getAddress());
    expect(pending).to.equal(ethers.utils.parseEther("2.0")); // 4 * 0.5
  });

  it("should not give bonus if >=5 kills but <5min", async () => {
    const price = await game.lifePrice();
    await game.connect(player).buyLives(1, { value: price });
    const tx = await game.connect(player).startGame();
    const receipt = await tx.wait();
    const gameId = receipt.events.find(e => e.event === "GameStarted").args.gameId;
    // Simulate 5 kills, 4 minutes
    await ethers.provider.send("evm_increaseTime", [4 * 60]);
      await ethers.provider.send("evm_mine", []);
    await expect(game.connect(player).endGame(gameId, 5))
      .to.emit(game, "GameEnded");
    const pending = await game.getPendingRewards(await player.getAddress());
    expect(pending).to.equal(ethers.utils.parseEther("2.5")); // 5 * 0.5
  });

  it("should give bonus if >=5 kills and >=5min", async () => {
    const price = await game.lifePrice();
    await game.connect(player).buyLives(1, { value: price });
    const tx = await game.connect(player).startGame();
    const receipt = await tx.wait();
    const gameId = receipt.events.find(e => e.event === "GameStarted").args.gameId;
    // Simulate 6 kills, 5 minutes
    await ethers.provider.send("evm_increaseTime", [5 * 60]);
      await ethers.provider.send("evm_mine", []);
    await expect(game.connect(player).endGame(gameId, 6))
      .to.emit(game, "GameEnded");
    const pending = await game.getPendingRewards(await player.getAddress());
    expect(pending).to.equal(ethers.utils.parseEther("18.0")); // 6*0.5 + 15
  });

  it("should allow player to claim rewards", async () => {
    const price = await game.lifePrice();
    await game.connect(player).buyLives(1, { value: price });
    const tx = await game.connect(player).startGame();
    const receipt = await tx.wait();
    const gameId = receipt.events.find(e => e.event === "GameStarted").args.gameId;
    await ethers.provider.send("evm_increaseTime", [2 * 60]);
      await ethers.provider.send("evm_mine", []);
    await game.connect(player).endGame(gameId, 3);
    const before = await ethers.provider.getBalance(await player.getAddress());
    const claimTx = await game.connect(player).claimRewards();
    const afterBal = await ethers.provider.getBalance(await player.getAddress());
    expect(afterBal).to.be.gt(before);
  });

  it("should only allow owner to set life price", async () => {
    await expect(game.connect(player).setLifePrice(ethers.utils.parseEther("0.02")))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(game.connect(owner).setLifePrice(ethers.utils.parseEther("0.02")))
      .to.emit(game, "LifePurchased").or.not.to.be.reverted;
  });

  it("should not allow starting game with no lives", async () => {
    await expect(game.connect(player).startGame()).to.be.revertedWith("No lives remaining");
  });
});