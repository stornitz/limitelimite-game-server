const GameManager = require('./game-manager.js');

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
      let game = this.gameManager.getOrCreate(gameId);
      
      socket.on('message', (message, ack) => {
          game.sendMessage(socket.id, message);
          ack();
      });

      socket.on('pick_card', (cardId, ack) => {
          game.pickCard(socket.id, cardId, ack);
      });

      game.join(socket, pseudo);

      socket.once('disconnect', () => {
          game.leave(socket.id).then(playerCount => {
            if(playerCount == 0) {
              this.gameManager.delete(game);
            }
          });

          // Allow garbage collection
          socket.removeAllListeners();
      });
    });

    socket.emit('games', this.gameManager.getGames());
  }
}

module.exports = ClientController;