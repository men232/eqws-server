const util         = require('util');
const EventEmitter = require('events');
const uid2         = require('uid2');
const uws          = require('uws');
const Socket       = require('./Socket');
const RedisAdapter = require('./RedisAdapter');

class Server extends EventEmitter {
	constructor(opts) {
		super();

		this.uid = uid2(6);
		this.wss   = new uws.Server(opts);
		this.redis = false;
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

		this.wss.on('connection', this.onconnect.bind(this));
	}

	useRedis(opts) {
		this.redis = new RedisAdapter(this, opts);
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

				if (!socket.hasRoom(roomId)) {
					socket.rooms.push(roomId);
					this.emit('room.join', roomId, socket);
				}
			}
		}
	}

	leave(roomId, socket) {
		if (this.rooms[roomId]) {
			delete this.rooms[roomId][socket.id];

			let index = socket.rooms.indexOf(roomId);
			socket.rooms.splice(index, 1);

			if (Object.keys(this.rooms[roomId]).length === 0) {
				delete this.rooms[roomId];
			}

			this.server.emit('room.leave', roomId, socket);
		}
	}

	broadcast(roomId, event, args, skipRedis = false) {
		if (this.redis && !skipRedis) {
			this.redis.publish(roomId, event, args);
		}

		let room = this.rooms[roomId];
		if (!room) return;

		for (let sid in room) {
			room[sid].sendEvent(event, args);
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
		socket.sendEvent('auth', {id: socket.id});

		socket.eventSystem.once('close', () => {
			for(let roomId in socket.rooms) {
				this.leave(roomId, socket);
			}
		});

		this.emit('connection', socket);
	}
}

module.exports = Server;