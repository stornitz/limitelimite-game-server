const BlackCards = require('./cards/blacks.json');
const RedCards = require('./cards/reds.json');
const { shuffle } = require('./utils.js');

class Deck {
  cards;
  pickedCards = [];
  playedCards = [];

  constructor(cards) {
    // Create Card object with the properties id and text, then shuffle it
    this.cards = shuffle(cards.map((text, id) => {
      return {id, text};
    }));
  }

  pick() {
    if(this.cards.length == 0) {
      this.cards = shuffle(this.playedCards);
      this.playedCards = [];
    }

    let card = this.cards.shift();
    this.pickedCards.push(card);
    return card;
  }

  play(cardId) {
    let index = this.pickedCards.findIndex(card => card.id == cardId);
    this.playedCards.push(this.pickedCards[index]);
    this.pickedCards.splice(index, 1);
  }

  pickAndPlay() {
    let card = this.pick();
    this.play(card.id);
    return card;
  }

  getCard(cardId) {
    return this.pickedCards.find(card => card.id == cardId);
  }
}

module.exports = {
  Deck, BlackCards, RedCards
};