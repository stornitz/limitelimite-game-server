const Config = require('./config.json');
const { shuffle, randomInArray } = require('./utils.js');

const { PlayersManager, PlayerState } = require('./player.js');
const { Deck, BlackCards, RedCards } = require('./deck.js');

const GameState = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PICKING: 'picking',
  BOSS_TURN: 'boss_turn',
  RESULT: 'result'
};

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

    this._emit = (...args) => this.io.in(this.gameKey).emit(...args);

    this._emitToOne = (socketId) => {
      return (...args) => this.io.to(`${socketId}`).emit(...args);
    }

    this.playersManager = new PlayersManager(this._emit, this._emitToOne);
  }

  join(socket, pseudo) {
    let newPlayer = this.playersManager.create(socket.id, pseudo);

    socket.join(this.gameKey);
    socket.emit('joined', newPlayer.playerId, this.playersManager.getPlayersByPlayerId());
    
    // TODO remove
    if(this.playersManager.lastPlayerId == 3) { 
      this._emit('message', {
        author: "Server",
        text: "Pour commencer la partie une fois que tous les joueurs ont rejoint, envoyez le message 'start' !"
      });
    }

    return newPlayer;
  }

  leave(socketId) {
    // TODO
  }

  start() {
    this.gameState = GameState.STARTING;
    this._emit('start', Config.countdowns.start);

    this.playersManager.players.forEach(player => {
      player.cards = Array.from({length: 7}, () => this.redDeck.pick());
    });

    this.gameTimeout = setTimeout(() => {
      let startingPlayer = randomInArray(this.playersManager.players);
      this.newRound(startingPlayer);
    }, Config.countdowns.start*1000);
  }
  
  newRound(bossPlayer) {
    this.bossPlayerId = bossPlayer.playerId;

    // - Reset game
    this.pickedCards = [];
    // Reset players state
    this.playersManager.players.forEach(player => {
      player.state = PlayerState.WAITING;
      player.selectedCardId = null;
    });


    bossPlayer.state = PlayerState.BOSS;

    this.gameState = GameState.PICKING;
    // This will reset local interface variables
    this._emit('new_round', this.blackDeck.pickAndPlay().text, this.bossPlayerId, Config.countdowns.round);

    this.gameTimeout = setTimeout(() => {
      this.bossTurn();
    }, Config.countdowns.round*1000);
  }

  bossTurn() {
    clearTimeout(this.gameTimeout);

    this.pickedCards = this.playersManager.players
      .filter(player => player.playerId != this.bossPlayerId)
      .map(player => ({
        player: player,
        cardId: player.selectedCard
      }));

    let emittedCards = shuffle(this.pickedCards.map(card => this.redDeck.getCard(card.cardId)))

    this.gameState = GameState.BOSS_TURN;
    this._emit('boss_turn', emittedCards, Config.countdowns.boss_turn);

    this.gameTimeout = setTimeout(() => {
      this.result(null);
    }, Config.countdowns.boss_turn*1000);
  }

  result(winCard = null) {
    clearTimeout(this.gameTimeout);

    if(winCard == null) {
      winCard = randomInArray(this.pickedCards);
    }

    // Increment winner score
    winCard.player.score++;

    this.gameState = GameState.RESULT;
    this._emit('result', {
      cardId: winCard.cardId,
      playerId: winCard.player.playerId
    }, Config.countdowns.result);

    // Replace players used cards
    this.pickedCards.forEach(card => {
      card.player.replaceUsedCard(card.cardId, this.redDeck.pick());
    });

    this.gameTimeout = setTimeout(() => {
      this.newRound(winCard.player);
    }, Config.countdowns.result*1000);
  }

  sendMessage(socketId, message) {
    if(message == 'start' && this.gameState == GameState.WAITING) {
      this.start();
    }

    this.playersManager.get(socketId).message(message);
  }

  pickCard(socketId, cardId) {
    let player = this.playersManager.get(socketId);
    if(player == null)
      return;

    if(this.gameState == GameState.PICKING && player.playerId != this.bossPlayerId) {
      player.pickCard(cardId);

      // If all players (but the boss) have picked theirs cards,
      if(this.playersManager.players.every(player => player.state == PlayerState.PICKED || player.state == PlayerState.BOSS)) {
        this.bossTurn();
      }
    } else if(this.gameState == GameState.BOSS_TURN && player.playerId == this.bossPlayerId) {
      let card = this.pickedCards.find(card => card.cardId == cardId);
      
      if(card == null)
        return;

      this.result(card);
    }
  }

  get playersCount() {
    return this.playersManager.lastPlayerId;
  }
}

module.exports = {
  Game
};