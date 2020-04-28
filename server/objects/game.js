const Config = require('../config.json');
const { shuffle, randomInArray } = require('../utils.js');

const GameState = require('../enums/game-state.js');
const PlayersManager = require('./players-manager.js');
const { Deck, BlackCards, RedCards } = require('./deck.js');

class Game {

  io;
  gameKey;

  playersManager;

  bossPlayerId;

  gameState = GameState.WAITING;
  redDeck = new Deck(RedCards);
  blackDeck = new Deck(BlackCards);

  pickedCards = [];

  constructor(io, key) {
    this.io = io;
    this.gameKey = key;

    this.emitToRoom = (...args) => this.io.in(this.gameKey).emit(...args);
    this.emitToOne = (socketId) => {
      return (...args) => this.io.to(`${socketId}`).emit(...args);
    }

    this.playersManager = new PlayersManager(this.emitToRoom, this.emitToOne);
  }

  join(socket, pseudo) {
    let isSpectating = (this.gameState != GameState.WAITING) && (this.gameState != GameState.STARTING); // If running game

    let newPlayer = this.playersManager.create(socket.id, pseudo, isSpectating);
    
    socket.join(this.gameKey);
    // TODO update protocol&client to add isSpectating
    socket.emit('joined', newPlayer.playerId, this.playersManager.getPlayersByPlayerId(), isSpectating);
  
    if(this.gameState != GameState.WAITING) {
      // TODO send game state
    }

    return newPlayer;
  }

  leave(socket) {
    socket.leave(this.gameKey);

    let removePromise;
    if(this.gameState == GameState.WAITING || this.gameState == GameState.STARTING) {
      removePromise = this.playersManager.remove(socket.id);
    } else { // If in running game
      removePromise = this.playersManager.removeLater(socket.id);
    }

    removePromise.then(newPlayerCount => {
      // If there's no longer enough players, stop the start
      if(this.gameState != GameState.WAITING && newPlayerCount < Config.min_players) {
        this.wait();
      }
    });

    return removePromise;
  }

  async wait() {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.WAITING;
    this.emitToRoom('waiting', Config.countdowns.start);
  }

  async start() {
    this.gameState = GameState.STARTING;
    this.emitToRoom('start', Config.countdowns.start);

    this.gameTimeout = setTimeout(() => {
      let startingPlayer = randomInArray(this.playersManager.players);
      this.newRound(startingPlayer);
    }, Config.countdowns.start*1000);
  }
  
  async newRound(bossPlayer) {
    this.gameState = GameState.PICKING;

    this.bossPlayerId = bossPlayer.playerId;

    // - Reset game state
    // Remove disconnect players, if any
    let playerCount = this.playersManager.removeNow();

    if(playerCount < Config.min_players) {
      this.wait();
      return;
    }

    // Reset player state and cards (pick new cards if needed)
    this.playersManager.players.forEach(player => player.setToNewRoundState(this.redDeck, Config.cards_in_hand));
    bossPlayer.setBoss();

    // This will reset local interface variables
    this.emitToRoom('new_round', this.blackDeck.pickAndPlay().text, this.bossPlayerId, Config.countdowns.round);

    this.gameTimeout = setTimeout(() => {
      this.bossTurn();
    }, Config.countdowns.round*1000);
  }

  async bossTurn() {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.BOSS_TURN;

    this.pickedCards = this.playersManager.pickingPlayers
      .map(player => ({
        player: player,
        cardId: player.selectedCard
      }));

    // Play and get the cards text, then shuffle the card to remove any picking order
    let emittedCards = shuffle(this.pickedCards.map(card => this.redDeck.play(card.cardId)))

    this.emitToRoom('boss_turn', emittedCards, Config.countdowns.boss_turn);

    this.gameTimeout = setTimeout(() => {
      this.result(null);
    }, Config.countdowns.boss_turn*1000);
  }

  async result(winCard = null) {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.RESULT;

    if(winCard == null) {
      winCard = randomInArray(this.pickedCards);
    }

    // Increment winner score
    winCard.player.score++;

    this.emitToRoom('result', {
      cardId: winCard.cardId,
      playerId: winCard.player.playerId
    }, Config.countdowns.result);

    this.gameTimeout = setTimeout(() => {
      this.newRound(winCard.player);
    }, Config.countdowns.result*1000);
  }

  sendMessage(socketId, message) {
    // TODO remove
    if(message == 'start' && this.gameState == GameState.WAITING && this.playersManager.players.length >= Config.min_players) {
      this.start();
    }

    this.playersManager.get(socketId).message(message);
  }

  pickCard(socketId, cardId, ack) {
    let player = this.playersManager.get(socketId);
    if(player == null)
      return;

    if(this.gameState == GameState.PICKING && !player.isBoss() && !player.isSpectating()) {
      player.pickCard(cardId);
      ack(true);

      if(this.playersManager.pickingPlayers.every(player => player.hasPicked())) {
        this.bossTurn();
      }
    } else if(this.gameState == GameState.BOSS_TURN && player.isBoss()) {
      let card = this.pickedCards.find(card => card.cardId == cardId);
      
      if(card != null) {
        this.result(card);
      }

      // Return true if the card was successfully selected
      ack(card != null);
    } else {
      ack(false);
    }
  }

  get playersCount() {
    return this.playersManager.lastPlayerId;
  }
}

module.exports = Game;