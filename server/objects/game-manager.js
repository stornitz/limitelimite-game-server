const Game = require('./game.js');

class GameManager {
    games = {};
    io;

    constructor(io) {
        this.io = io;
    }

    getOrCreate(key) {
        if(!(key in this.games)) {
            this.games[key] = new Game(this.io, key);
        }
        return this.games[key];
    }

    delete(game) {
        delete this.games[game.id];
    }

    getGames() {
        return Object.keys(this.games).map(gameId => ({
            id: gameId,
            playersCount: this.games[gameId].playersCount
        }));
    }
}

module.exports = GameManager;