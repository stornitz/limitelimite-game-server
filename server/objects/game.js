var moment = require('moment');

const Config = require('../config.json');
const { shuffle, randomInArray } = require('../utils.js');

const GameState = require('../enums/game-state.js');
const PlayersManager = require('./players-manager.js');
const { Deck, BlackCards, RedCards } = require('./deck.js');

// TODO rename Game to Room for better understanding
class Game {

  io;
  gameKey;

  playersManager;

  bossPlayerId;

  gameState = GameState.WAITING;
  redDeck = new Deck(RedCards);
  blackDeck = new Deck(BlackCards);

  gameStateParameters = [];

  gameTimeout = null;
  gameTimeoutEnd = null;

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
    socket.emit('joined', newPlayer.playerId, this.playersManager.getPlayersByPlayerId(), isSpectating);
  
    if(this.gameState != GameState.WAITING) {
      this.sendGameState(socket);
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

  sendGameState(socket) {
    let remainingCountDown = null;

    if(this.gameTimeoutEnd != null) {
      remainingCountDown = this.gameTimeoutEnd.diff(moment(), 'seconds');
    }

    socket.emit('game_state', this.gameState, remainingCountDown, ...gameStateParameters);
  }

  setTimer(fct, countdown) {
    this.gameTimeout = setTimeout(() => {
      // Reset the timeout
      this.gameTimeoutEnd = null;
      fct();
    }, countdown*1000);

    this.gameTimeoutEnd = moment().add(countdown, 'seconds');
  }

  async wait() {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.WAITING;
    this.emitToRoom('waiting');
  }

  async start() {
    this.gameState = GameState.STARTING;
    this.emitToRoom('start', Config.countdowns.start);

    this.setTimer(() => {
      let startingPlayer = randomInArray(this.playersManager.players);
      this.newRound(startingPlayer);
    }, Config.countdowns.start);
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

    // Reset game state parameters
    this.gameStateParameters = [];

    // Reset player state and cards (pick new cards if needed)
    this.playersManager.players.forEach(player => player.setToNewRoundState(this.redDeck, Config.cards_in_hand));
    bossPlayer.setBoss();

    let blackCard = this.blackDeck.pickAndPlay().text;

    // Save for eventual joining spectators
    this.gameStateParameters.push(blackCard);

    // This will reset local interface variables
    this.emitToRoom('new_round', blackCard, this.bossPlayerId, Config.countdowns.round);

    this.setTimer(() => {
      this.bossTurn();
    }, Config.countdowns.round);
  }

  async bossTurn() {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.BOSS_TURN;

    this.pickedCards = shuffle(this.playersManager.pickingPlayers
      .map(player => ({
        player: player,
        cardId: player.selectedCard
      })));

    // Play and get the cards text, then shuffle the card to remove any picking order
    let emittedCards = this.pickedCards.map(card => this.redDeck.play(card.cardId));

    // Save for eventual joining spectators
    this.gameStateParameters.push(emittedCards);

    this.emitToRoom('boss_turn', emittedCards, Config.countdowns.boss_turn);

    this.setTimer(() => {
      this.result(null);
    }, Config.countdowns.boss_turn);
  }

  async result(winCard = null) {
    clearTimeout(this.gameTimeout);
    this.gameState = GameState.RESULT;

    if(winCard == null) {
      winCard = randomInArray(this.pickedCards);
    }

    // Increment winner score
    winCard.player.score++;

    let winner = {
      cardId: winCard.cardId,
      playerId: winCard.player.playerId
    };

    // Save for eventual joining spectators
    this.gameStateParameters.push(winner);

    this.emitToRoom('result', winner, Config.countdowns.result);

    this.setTimer(() => {
      this.newRound(winCard.player);
    }, Config.countdowns.result);
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
    return this.playersManager.playerCount;
  }
}

module.exports = Game;