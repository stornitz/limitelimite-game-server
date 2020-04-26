const GameManager = require('./game-manager.js');
const GameState = require('../enums/game-state.js');

class ClientController {

  io;
  gameManager;

  constructor(io) {
    this.io = io;
    this.gameManager = new GameManager(io);
  }

  registerListener() {
    this.io.on('connection', (socket) => this.handleClient(socket));
  }

  handleClient(socket) {
    socket.once('join', (gameId, pseudo) => {
      let game = this.gameManager.getGame(gameId);

      // TODO remove
      if(game.gameState != GameState.WAITING) {
          return;
      }
      
      socket.on('message', (message, ack) => {
          game.sendMessage(socket.id, message);
          ack();
      });

      socket.on('pick_card', (cardId) => {
          game.pickCard(socket.id, cardId);
      });

      game.join(socket, pseudo);

      socket.once('disconnect', () => {
          game.leave(socket.id);
      });
    });

    socket.emit('games', this.gameManager.getGames());
  }
}

module.exports = ClientController;