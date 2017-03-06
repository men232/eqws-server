const uid2         = require('uid2');
const EventEmitter = require('events').EventEmitter;

class SocketWrapper extends EventEmitter {
	constructor(socket, opts) {
		super();

		this.socket   = socket;
		this.isClosed = false;
		this.auth     = false;
		this.authData = null;
		this.uid      = uid2(6);

		this._options = opts;
		this._parser  = opts.parser;
		this._rooms = [];
		this._handshakeData = null;
		this._messageFormat = 'json';
		this._setUpHandshakeData();

		this.socket.once('close', this._onSocketClose.bind(this));
		this.socket.on('message', this._onSocketMessage.bind(this));
		this._pingTimer = setInterval(this._ping.bind(this), opts.pingInterval);
	}

	setAuth(flag, data = null) {
		const prevAuth = this.authData;

		this.auth     = !!flag;
		this.authData = data;

		if (flag) {
			this.emit('authorized', data, prevAuth);
		} else {
			this.emit('unauthorized', prevAuth);
		}
	}

	setParser(parser) {
		this._parser  = parser;
	}

	sendEvent(event, args) {
		this.send({event, args});
	}

	send(data) {
		try {
			let encoded = this._parser.encode(data);
			this.sendNative(encoded);
		} catch(err) {
			this._options.logger.error('encode socket message error', err);
		}
	}

	sendNative(message) {
		this.socket.send(message);
	}

	getHandshakeData() {
		return this._handshakeData;
	}

	destroy() {
		this.socket.close();
	}

	_ping() {
		this.socket.ping();
	}

	_onSocketClose() {
		this.isClosed = true;
		this.emit('close');
		this.socket.removeAllListeners();
		clearInterval(this._pingTimer);
		this._pingTimer = null;
	}

	_onSocketMessage(data) {
		try {
			let decoded = this._parser.decode(data);
			this.emit('message', decoded);
		} catch(err) {
			this._options.logger.error('decode socket message error', err);
		}
	}

	_setUpHandshakeData() {
		this._handshakeData = {
			remoteAddress: this.socket._socket.remoteAddress
		}

		if (this.socket.upgradeReq) {
			this._handshakeData.headers = this.socket.upgradeReq.headers;
			this._handshakeData.referer = this.socket.upgradeReq.headers.referer;
			this._handshakeData.url = this.socket.upgradeReq.url;
		}

		return this._handshakeData;
	}
}

module.exports = SocketWrapper;