const Player = require('./player.js');

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

module.exports = PlayersManager;