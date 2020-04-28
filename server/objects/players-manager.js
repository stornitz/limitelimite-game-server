const Player = require('./player.js');
const PlayerState = require('../enums/player-state.js');
const { removeById } = require('../utils.js');

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
    // TODO change to player_joined
    this.emitToRoom('new_player', newPlayer.get());

    return newPlayer;
  }

  remove(socketId) {
    let player = this.playersBySocketId[socketId];
    
    delete this.playersBySocketId[socketId];
    removeById(this.players, player.id);

    this.emitToRoom('player_left', player.id);

    return Promise.resolve(this.playerCount);
  }

  removeLater(socketId) {
    let player = this.playersBySocketId[socketId];
    player.setDisconnected();
    
    playersToRemove.push(player);

    let promise = new Promise((resolve) => {
      // We replace the old pending promise, no longer necessary
      this.resolveRemovedPromise = resolve;
    });

    // If we have to remove all players, we can do it now, no need to wait
    if(this.playersToRemove.length == this.players.length) {
      removeNow();
    }
    
    return promise;
  }

  removeNow() {
    if(players.playersToRemove.length > 0) {
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