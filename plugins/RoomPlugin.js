class RoomPlugin {
	constructor(opts = {}) {
		this._options = opts;
		this._rooms = {};
		this._clusterAdapter = null;
		this._chanelName = 'room.event';
	}

	init(ws, opts) {
		if (!this._options.logger) this._options.logger = opts.logger;

		this._ws = ws;

		this._ws.on('connecting', this._onConnecting.bind(this));
		this._ws.on('disconnect', this._onDisconnect.bind(this));
		this._ws.on('clusterInitialized', this._onClusterInitialized.bind(this));
		this._ws.on(this._chanelName, this._onRoomEvent.bind(this));

		ws.getRoomSockets = this.getSockets.bind(this);
		ws.to = this.to.bind(this);
	}

	to(roomId) {
		const join = (socket) => this._join(socket, roomId);
		const emit = (eventName, args) => this._emit(roomId, eventName, args);

		return {join, emit};
	}

	getSockets(roomId) {
		const room = this._rooms[roomId];
		return room ? room.slice(0) : [];
	}

	_emit(roomId, eventName, args, broadcast = true) {
		const log     = this._options.logger;
		const sockets = this.getSockets(roomId);

		if (broadcast) {
			this._broadcast(roomId, eventName, args);
		}

		if (!sockets.length) return;

		log.debug('emit room event', {roomId, eventName, args});

		for (let uid in sockets) {
			let socket = sockets[uid];
			socket.sendEvent(eventName, args);
		}
	}

	_onClusterInitialized(adapter) {
		this._clusterAdapter = adapter;
	}

	_broadcast(roomId, eventName, args) {
		const adapter = this._clusterAdapter;

		if (adapter) {
			adapter.broadcast(this._chanelName, roomId, eventName, args);
		}
	}

	_join(socket, roomId) {
		if (!this._rooms[roomId]) {
			this._rooms[roomId] = [];
		}

		const room = this._rooms[roomId];
		const index = room.indexOf(socket);
		const log = this._options.logger;

		if (index < 0) {
			log.debug('join to room', {socketId: socket.uid, roomId});

			room.push(socket);
			socket._rooms.push(roomId);
		}
	}

	_leave(socket, roomId) {
		if (!this._rooms[roomId]) return;

		const log = this._options.logger;
		const room = this._rooms[roomId];
		const indexInServer = room.indexOf(socket);
		const indexInSocket = socket._rooms.indexOf(roomId);

		log.debug('leave from room', {socketId: socket.uid, roomId});

		if (indexInServer >= 0) room.splice(indexInServer, 1);
		if (indexInSocket >= 0) socket._rooms.splice(indexInSocket, 1);

		if (this._rooms[roomId].length === 0) {
			delete this._rooms[roomId];
		}
	}

	_onConnecting(socket) {
		socket._rooms = [];
		socket.join = this._join.bind(this, socket);
		socket.to = (roomId) => {
			return {
				join: () => socket.join.bind(this, roomId),
				emit: (eventName, args) => this._emit.bind(this, roomId, eventName, args)
			}
		};

		socket.leave = this._leave.bind(this, socket);
		socket.getRooms = () => socket._rooms;
	}

	_onDisconnect(socket) {
		while(socket._rooms.length > 0) {
			this._leave(socket, socket._rooms[0]);
		}
	}

	_onRoomEvent(roomId, eventName, args) {
		const log = this._options.logger;

		log.debug('recevied room event', {roomId, eventName, args});

		this._emit(roomId, eventName, args, false);
	}
}

module.exports = RoomPlugin;