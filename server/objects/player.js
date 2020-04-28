const { randomInArray, removeById } = require('../utils.js');
const PlayerState = require('../enums/player-state.js');

class Player {
  emitToRoom;
  emitToSelf;

  playerId;
  name;

  state = null;
  score = 0;
  hand = [];
  disconnected = false;
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

  // TODO remove from client and protocol
  replaceUsedCard(oldCardId, newCard) {
    let index = this.hand.findIndex(card => card.id == oldCardId);
    this.hand[index] = newCard;

    this.emitToSelf('replace_card', oldCardId, newCard);
  }

  // Return true if the card was picked
  pickCard(cardId) {
    if(cardId == this.selectedCardId)
      return true;

    if(cardId != null && !this.hand.includes(cardId)) 
      return false;

    this.selectedCardId = cardId;
    this.newState = (cardId == null) ? PlayerState.CHOOSING : PlayerState.PICKED;
    return true;
  }

  setToNewRoundState(deck, maxCardsInHand) {
    this.state = PlayerState.WAITING;

    if(this.selectedCardId != null) {
      removeById(this.hand, this.selectedCardId);
    }

    let newCards = [];
    while(this.hand.length < maxCardsInHand) {
      newCards.push(deck.pick());
    }

    hand.push(...newCards);
    
    if(newCards.length > 0 || this.selectedCardId != null) {
      // TODO add to client and protocol
      this.emitToSelf('fill_hand', this.selectedCardId, newCards);
      this.selectedCardId = null;
    }
  }

  setDisconnected() {
    // We send the new player state to the others players
    // But we keep the internal value for game continuity.
    this.disconnected = true;
    this.emitToRoom('update_state', this.playerId, PlayerState.DISCONNECTED);
  }

  setBoss() {
    this.state = PlayerState.BOSS;
  }

  hasPicked() {
    return this.state == PlayerState.PICKED;
  }

  isBoss() {
    return this.state == PlayerState.BOSS;
  }

  isSpectating() {
    return thiss.state == PlayerState.SPECTATING;
  }

  // TODO remove from client and protocol
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