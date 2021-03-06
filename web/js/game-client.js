function SocketIOClient() {
    this.sendMessage = function(message, callback) {
        socket.emit('message', message, callback);
    }

    this.pickCard = function(cardId, callback) {
        socket.emit('pick_card', cardId);
    }

    this.joinGame = function(gameId, pseudo) {
        socket.emit('join', gameId, pseudo);
    }

    function updatePlayerState(playerId, state) {
        Vue.set(vm.players[playerId], 'state', state);
    };

    let socket = io(window.location.protocol + '//' + window.location.host/*, {
        query: {
            oldSessionId: sessionStorage.getItem(SESSION_ID_STORAGE_KEY)
        }
    }*/);

    /*socket.on('connected', () => {
        sessionStorage.setItem(SESSION_ID_STORAGE_KEY, socket.id);
        console.log(socket);
    });*/

    socket.on('games', (games) => {
        vm.games = games;
    });

    socket.on('joined', (localPlayerId, players, isSpectating) => {
        vm.localPlayerId = localPlayerId;
        vm.players = players;

        if(isSpectating) {
            updatePlayerState(localPlayerId, 'spectating');
            // TODO set spectating mode
        }
    });

    socket.on('player_joined', (player) => {
        Vue.set(vm.players, player.id, player);
    });

    socket.on('player_left', (playerId) => {
        Vue.delete(vm.players, playerId);
    });

    socket.on('message', (message) => {
        vm.messages.push(message);
    });

    socket.on('game_state', () => {
        // TODO implement
    })

    socket.on('waiting', () => {
        vm.gameState = 'waiting';
        Countdown.cancel();
    });

    socket.on('start', (countdownDuration) => {
        vm.gameState = 'starting';
        Countdown.start(countdownDuration);
    });

    socket.on('update_state', updatePlayerState);

    socket.on('new_round', (question, bossPlayerId, countdownDuration) => {
        vm.question = question;
        vm.gameState = 'picking';

        // Reset local variables
        vm.selectedCardId = null;
        vm.pickedCards = [];
        vm.winner = null;

        // Reset players state and set boss state
        // Yes, we'll set two times the boss state (once choosing and once boss), but we'll avoid a comparison by players
        Object.keys(vm.players).forEach(playerId => updatePlayerState(playerId, 'choosing'));
        updatePlayerState(bossPlayerId, 'boss');

        Countdown.start(countdownDuration);
    });

    socket.on('picked_card', cardId => {
        vm.selectedCardId = cardId;
    });

    socket.on('boss_turn', (pickedCards, countdownDuration) => {
        vm.pickedCards = pickedCards;
        vm.gameState = 'boss_turn';
        Countdown.start(countdownDuration);
    });

    socket.on('result', (winner, countdownDuration) => {
        vm.winner = winner;

        // Increment winner score
        Vue.set(vm.players[winner.playerId], 'score', vm.players[winner.playerId].score + 1);

        vm.gameState = 'result';
        Countdown.start(countdownDuration);
    });

    socket.on('fill_hand', (oldCardId, newCards) => {
        let index = vm.handCards.findIndex(card => card.id == oldCardId);

        vm.handCards.splice(index, 1);
        vm.handCards.push(...newCards);
    });
};

var socketClient = new SocketIOClient();