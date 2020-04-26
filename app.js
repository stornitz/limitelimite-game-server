const ClientController = require('./server/objects/client-controller.js')
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const http = require('http');
const socketio = require('socket.io');

// Create http handler method
const serve = serveStatic('web');
function handler(req, res) {
    serve(req, res, finalhandler(req, res));
}

// Create servers
const server = http.createServer(handler);
const io = socketio(server);

const clientController = new ClientController(io);
clientController.registerListener();

// Start server
const port = process.env.PORT || 80;
server.listen(port, () => console.log('Server started on 0.0.0.0:' + port));