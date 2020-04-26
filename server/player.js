const { randomInArray } = require('./utils.js');

const PlayerState = {
  CHOOSING: 'choosing',
  PICKED: 'ok',
  BOSS: 'boss'
};

class PlayersManager {
  emitToRoom;
  emitToOne;

  lastPlayerId = 0;

  players = [];
  playersBySocketId = {};

  constructor(emitToRoom, emitToPlayer) {
    this.emitToRoom = emitToRoom;
    this.emitToPlayer = emitToPlayer;
  }

  get(socketId) {
    return this.playersBySocketId[socketId];
  }

  getPlayersByPlayerId() {
    let playersByPlayerId = {};
    this.players.map(player => player.get())
      .forEach(player => {
        playersByPlayerId[player.id] = player
      });

    return playersByPlayerId;
  }

  create(socketId, name) {
    let newPlayer = new Player(this.emitToRoom, this.emitToPlayer(socketId), ++this.lastPlayerId, name);    

    this.players.push(newPlayer);
    this.playersBySocketId[socketId] = newPlayer;

    // This will not emit to the newly created player, as he's not in the room yet.
    this.emitToRoom('new_player', newPlayer.get());

    return newPlayer;
  }
}

class Player {
  emitToRoom;
  emitToSelf;

  playerId;

  name;
  state = PlayerState.CHOOSING;
  score = 0;
  hand = [];

  selectedCardId = null;

  constructor(emitToRoom, emitToSelf, playerId, name) {
    this.emitToRoom = emitToRoom;
    this.emitToSelf = emitToSelf;

    this.playerId = playerId;
    this.name = name;
  }

  get() {
    return {
      id: this.playerId,
      name: this.name, 
      score: this.score,
      state: this.state
    };
  }

  message(message) {
    this.emitToRoom('message', {
      author: this.name,
      colorId: this.playerId,
      text: message
    });
  }

  replaceUsedCard(oldCardId, newCard) {
    let index = this.hand.findIndex(card => card.id == oldCardId);
    this.hand[index] = newCard;

    this.emitToSelf('replace_card', oldCardId, newCard);
  }

  pickCard(cardId) {
    if(cardId == this.selectedCardId)
      return;

    if(cardId != null && !this.hand.includes(cardId)) 
      return;

    this.selectedCardId = cardId;
    this.newState = (cardId == null) ? PlayerState.CHOOSING : PlayerState.PICKED;
  }

  set cards(cards) {
    this.hand = cards.map(card => card.id);
    this.emitToSelf('hand', cards);
  }

  get selectedCard() {
    if(this.selectedCardId == null) {
      this.selectedCardId = randomInArray(this.hand);
      this.emitToSelf('picked_card', this.selectedCardId);
    }

    return this.selectedCardId;
  }

  set newState(newState) {
    this.state = newState;
    this.emitToRoom('update_state', this.playerId, newState);
  }
}

module.exports = {
  PlayersManager, 
  Player, 
  PlayerState,
};