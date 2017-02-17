const util = require('util');
const EventEmitter = require('events');
const uws = require('uws');
const Socket = require('./Socket');

class Server extends EventEmitter {
	constructor(opts) {
		super();

		this.wss    = new uws.Server(opts);
		this.rooms  = {
			default: []
		};
		this.logger = {
			log: console.log,
			debug: console.log,
			info: console.info,
			error: console.error,
			warn: console.warn
		};

		this.$emit = EventEmitter.prototype.emit.bind(this);
		this.wss.on('connection', this.onconnect.bind(this));
	}

	emit(eventName, args) {
		this.broadcast('default', eventName, args);
	}

	to(roomId) {
		return {
			emit: (event, args) => {
				this.broadcast(roomId, event, args);
			},
			join: (socket) => {
				if (!this.rooms[roomId]) {
					this.rooms[roomId] = {};
				}

				this.rooms[roomId][socket.id] = socket;

				if (socket.rooms.indexOf(roomId) < 0) {
					socket.rooms.push(roomId);
				}

				this.$emit('room.join', roomId, socket);
			}
		}
	}

	leave(roomId, socket) {
		if (this.rooms[roomId]) {
			delete this.rooms[roomId][socket.id];

			this.server.$emit('room.leave', roomId, socket);
		}
	}

	broadcast(roomId, event, args) {
		let room = this.rooms[roomId];
		if (!room) return;

		for (let sid in room) {
			room[sid].emit(event, args);
		}
	}

	setLogger(logger) {
		this.logger = logger;
	}

	onconnect(socket) {
		this.logger.debug('in-comming connection from %s:%s',
			socket._socket.remoteAddress, socket._socket.remotePort);

		Socket.call(socket, this);

		socket.join('default');
		socket.emit('auth', {id: socket.id});

		socket.once('close', () => {
			for(let roomId in socket.rooms) {
				socket.leave(roomId);
			}
		});

		this.$emit('connection', socket);
	}
}

module.exports = Server;