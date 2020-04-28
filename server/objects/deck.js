const BlackCards = require('../cards/blacks.json');
const RedCards = require('../cards/reds.json');
const { shuffle } = require('../utils.js');

class Deck {
  cards;
  pickedCards = [];
  playedCards = [];

  constructor(cards) {
    // Create cards objects with the properties id and text, then shuffle it
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
    let card = this.pickedCards[index];
    this.playedCards.push(card);
    this.pickedCards.splice(index, 1);

    return card;
  }

  pickAndPlay() {
    let card = this.pick();
    this.play(card.id);
    return card;
  }
}

module.exports = {
  Deck, BlackCards, RedCards
};