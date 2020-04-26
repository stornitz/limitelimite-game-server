const { randomInArray } = require('../utils.js');
const PlayerState = require('../enums/player-state.js');

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

module.exports = Player;