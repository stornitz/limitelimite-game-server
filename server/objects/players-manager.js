const Player = require('./player.js');
const PlayerState = require('../enums/player-state.js');
const { removeFirst } = require('../utils.js');

class PlayersManager {
  emitToRoom;
  emitToOne;

  lastPlayerId = 0;

  players = [];
  playersBySocketId = {};

  playersToRemove = [];
  removedPromise;

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

  create(socketId, name, isSpectating) {
    let newPlayer = new Player(this.emitToRoom, this.emitToPlayer(socketId), ++this.lastPlayerId, name);

    if(isSpectating) {
      newPlayer.state = PlayerState.SPECTATING;
    }

    this.players.push(newPlayer);
    this.playersBySocketId[socketId] = newPlayer;

    // This will not emit to the newly created player, as he's not in the room yet.
    this.emitToRoom('player_joined', newPlayer.get());

    return newPlayer;
  }

  remove(socketId) {
    let leavingPlayer = this.playersBySocketId[socketId];
    
    delete this.playersBySocketId[socketId];
    removeFirst(this.players, (player) => player.playerId == leavingPlayer.playerId);

    this.emitToRoom('player_left', leavingPlayer.playerId);

    return Promise.resolve(this.playerCount);
  }

  removeLater(socketId) {
    let player = this.playersBySocketId[socketId];
    player.setDisconnected();
    
    this.playersToRemove.push(socketId);

    let promise = new Promise((resolve) => {
      // We replace the old pending promise, no longer necessary
      this.resolveRemovedPromise = resolve;
    });

    // If we have to remove all players, we can do it now, no need to wait
    if(this.playersToRemove.length == this.players.length) {
      this.removeNow();
    }
    
    return promise;
  }

  removeNow() {
    if(this.playersToRemove.length > 0) {
      this.playersToRemove.forEach(this.remove, this);
      this.resolveRemovedPromise(this.playerCount);
      
      this.playersToRemove = [];
      this.resolveRemovedPromise = null;
    }

    return this.playerCount;
  }

  get playerCount() {
    return this.players.length;
  }

  get pickingPlayers() {
    return this.players.filter(player => !player.isBoss() && !player.isSpectating());
  }
}

module.exports = PlayersManager;