const Game = require('./game.js');

class GameManager {
    games = {};
    io;

    constructor(io) {
        this.io = io;
    }

    getGame(key) {
        if(!(key in this.games)) {
            this.games[key] = new Game(this.io, key);
        }
        return this.games[key];
    }

    getGames() {
        return Object.keys(this.games).map(gameId => ({
            id: gameId,
            playersCount: this.games[gameId].playersCount
        }));
    }
}

module.exports = GameManager;