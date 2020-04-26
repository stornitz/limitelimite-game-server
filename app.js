const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const server = require('http').createServer(handler);
const io = require('socket.io')(server);

const { Game } = require('./server/game.js');

let serve = serveStatic('web', { 'index': ['index.html'] });

function handler(req, res) {
    serve(req, res, finalhandler(req, res));
}

let games = {};

// TODO move to class
const GameState = {
    WAITING: 'waiting',
    STARTING: 'starting',
    PICKING: 'picking',
    BOSS_TURN: 'boss_turn',
    RESULT: 'result'
};

function getGame(key) {
    if(!(key in games)) {
        games[key] = new Game(io, key);
    }
    return games[key];
}

io.on('connection', function(socket) {
    socket.once('join', (gameId, pseudo) => {
        let game = getGame(gameId);

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

    socket.emit('games', Object.keys(games).map(gameId => ({
        id: gameId,
        playersCount: games[gameId].playersCount
    })));
});

server.listen(80, () => console.log('Server started'));