const uws = require('uws');
const base64id = require('base64id');
const EventEmitter = require('events');

class Server extends EventEmitter {
	constructor(opts) {
		super();

		this.wss    = new uws.Server(opts);
		this.rooms  = {};
		this.logger = {
			log: console.log,
			debug: console.log,
			info: console.info,
			error: console.error,
			warn: console.warn
		};

		this.wss.on('connection', this.onconnect.bind(this));
	}

	sendMessage(roomId, msg) {
		this.broadcast(roomId, 'chat.msg', {
			author: { name: 'Сервис', id: 0 },
			important: true,
			msg: msg
		});
	}

	setLogger(logger) {
		this.logger = logger;
	}

	getRoomOnline(roomId) {
		if (this.rooms[roomId]) {
			return Object.keys(this.rooms[roomId]).length;
		}

		return 0;
	}

	sendRoomState(roomId) {
		if (!this.rooms[roomId]) return;

		let online = this.getRoomOnline(roomId);

		this.broadcast(roomId, 'room.state', {
			id: roomId,
			online
		});
	}

	broadcast(roomId, event, args) {
		let room = this.rooms[roomId];
		if (!room) return;

		let packet = JSON.stringify({ event, args });

		for (let sid in room) {
			let socket = room[sid];
			socket.send(packet);
		}
	}

	joinToRoom(roomId, socket) {
		this.leaveFromRoom(socket);

		if (!this.rooms[roomId]) {
			this.rooms[roomId] = {};
		}

		this.rooms[roomId][socket.id] = socket;
		socket.__room = roomId;

		this.emit('room.join', roomId, socket);
	}

	leaveFromRoom(socket) {
		let roomId = socket.__room;

		if (roomId && this.rooms[roomId] && this.rooms[roomId][socket.id]) {
			delete this.rooms[roomId][socket.id];
		}

		socket.__room = null;
		this.emit('room.leave', roomId, socket);
	}

	onconnect(socket) {
		this.logger.debug('in-comming connection from %s:%s',
			socket._socket.remoteAddress, socket._socket.remotePort);

		socket.id = base64id.generateId();
		socket.server = this;

		let authData = JSON.stringify({
			event: 'auth',
			args: {
				id: socket.id
			}
		});

		// Room API
		socket.room = {
			join: join.bind(socket),
			leave: leave.bind(socket),
			getCurrentId: getCurrentId.bind(socket),
			broadcast: broadcast.bind(socket),
			sendMessage: sendMessage.bind(socket),
		};

		socket.send(authData);
		socket.once('close', () => socket.room.leave());

		this.emit('connection', socket);
	}
}

// Broadcast to current socket room
function broadcast(event, data) {
	let server = this.server;
	let roomId = this.room.getCurrentId();

	if (!roomId) return;

	return server.broadcast(roomId, event, data);
}

// Method to get current room id
function getCurrentId() {
	return this.__room;
}

// Leave from current room
function leave() {
	let server = this.server;
	return server.leaveFromRoom(this);
}

// Join to room
function join(roomId) {
	let server = this.server;
	return server.joinToRoom(roomId, this);
}

function sendMessage(msg) {
	this.room.broadcast('chat.msg', {
		author: { name: 'Anon~' + this.id, id: this.id },
		msg: msg
	});
}

module.exports = Server;