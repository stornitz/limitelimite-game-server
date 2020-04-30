const STATE_CLASSES = {
    'choosing': 'fa-ellipsis-h',
    'ok': 'fa-check',
    'boss': 'fa-gavel',
    'spectating': 'fa-eye',
    'disconnected': 'sign-out-alt'
}

const BLANK_REGEX = /\[BLANK\]/g;
const BLANK_PLACEHOLDER = '<span class="line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';

var vm = new Vue({
    el: '#app',
    data: function() {
        return {
            page: 'pseudo_picking', // pseudo_picking => game_picking => game
            pseudo: null,
            games: [{
                id: "john",
                playersCount: 4
            }],
            gameId: null,
            gameState: 'waiting', // waiting => starting => picking => boss_turn => result
            timeLeft: 0,
            localPlayerId: null,
            players: {},
            question: "toto",
            handCards: [],
            pickedCards: [],
            selectedCardId: null,
            winner: null,
            message: null,
            sendingMessage: false,
            messages: []
        }
    },
    filters: {
        getStateClass: state => STATE_CLASSES[state],
        toSingleElementArray: value => value != undefined ? [value] : [],
        formatTime: seconds => `${Math.floor(seconds / 60)}:${seconds % 60}`,
        paddingZero: number => (number < 10) ? '0' + number : number
    },
    computed: {
        sortedPlayers: function() {
            return Object.values(this.players).sort((a, b) => b.score - a.score);
        },
        htmlQuestion: function() {
            return this.question == null ? '' : this.question.replace(BLANK_REGEX, BLANK_PLACEHOLDER);
        },
        localPlayerIsBoss: function() {
            return this.localPlayerId != null && this.players[this.localPlayerId].state == 'boss';
        },
        secondsLeft: function() {
            return this.timeLeft % 60;
        },
        minutesLeft: function() {
            return Math.floor(this.timeLeft / 60);
        },
        selectedCard: function() {
            return this.selectedCardId ? this.handCards.find(card => card.id == this.selectedCardId) : null;
        }
    },
    methods: {
        definePseudo: function() {
            if(!this.pseudo) {
                return;
            }

            localStorage.setItem('pseudo', this.pseudo);
            if(this.gameId) {
                this.joinGame();
            } else {
                this.page = 'game_picking';
            }
        },
        joinGame: function(gameId = null) {
            if(gameId != null) {
                this.gameId = gameId;
            }

            socketClient.joinGame(this.gameId, this.pseudo);
            window.location.hash = '#' + this.gameId;
            this.page = 'game';
        },
        selectCard: function(cardId) {
            if (this.gameState != 'picking' || this.localPlayerIsBoss) {
                return;
            }

            if (this.selectedCardId == null || this.selectedCardId != cardId) {
                this.selectedCardId = cardId;
            } else {
                this.selectedCardId = null;
            }

            socketClient.pickCard(this.selectedCardId, () => {
                // TODO use ack
            });
        },
        selectWinnerCard: function(cardId) {
            if (this.gameState != 'boss_turn' || !this.localPlayerIsBoss) {
                return;
            }

            socketClient.pickCard(cardId, () => {
                // TODO use ack
            });
        },
        getPickedClass: function(cardId) {
            if (this.winner == null || this.winner.cardId != cardId) {
                return [];
            }

            return ['gagnante', 'bg-color' + this.winner.playerId];
        },
        sendMessage: function() {
            if(this.message == null) {
                return;
            }

            this.sendingMessage = true;

            socketClient.sendMessage(this.message, () => {
                this.sendingMessage = false;
                this.message = null;
            });
        }
    },
    created: function() {
        this.pseudo = localStorage.getItem('pseudo');
        this.gameId = window.location.hash.substr(1);
    }
});

var Countdown = new (function() {
    var countDownTimeout = null;

    function countDown() {
        if(vm.timeLeft > 0) {
            vm.timeLeft--;
            countDownTimeout = setTimeout(countDown, 1000);
        }
    }

    this.start = function(time) {
        clearTimeout(countDownTimeout);
        
        vm.timeLeft = time;
        setTimeout(countDown, 1000);
    }

    this.cancel = function() {
        clearTimeout(countDownTimeout);
    }
})();