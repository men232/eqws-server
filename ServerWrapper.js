const util         = require('util');
const EventEmitter = require('events');
const uid2         = require('uid2');
const uws          = require('uws');
const compose      = require('koa-compose');

const SocketWrapper  = require('./SocketWrapper');
const Parser         = require('./Parser');

class ServerWrapper extends EventEmitter {
	constructor(opts = {}) {
		super();

		if (!opts.logger) opts.logger = console;
		if (!opts.parser) opts.parser = Parser.json;
		if (!opts.pingInterval) opts.pingInterval = 3000;

		this.uid = uid2(6);

		this._options = opts;
		this._sockets = [];
		this._plugins = [];

		this._ws = new uws.Server(opts);
		this._ws.on('error', this._onError.bind(this));
		this._ws.on('connection', this._onConnection.bind(this));

		this.use('authentication', async (socket) => {
			this._options.logger.debug(`simple auth (${socket.uid})`);
			return {empty: true};
		});
	}

	plugin(plugin) {
		this._plugins.push(plugin);
		plugin.init(this, this._options);
	}

	set(key, value) {
		this._options[key] = value;
	}

	use(key, fn) {
		this[`_${key}`] = fn;
	}

	getWebScoketServer() {
		return this._ws;
	}

	getSockets() {
		this._sockets;
	}

	getConnectionCount() {
		return this._sockets.length
	}

	async _authentication() {}

	_onConnection(socket) {
		const socketWrapper = new SocketWrapper(socket, this._options);
		const handshakeData = socketWrapper.getHandshakeData();
		const logMsg = `connection from ${handshakeData.origin} (${handshakeData.remoteAddress})`;
		const log = this._options.logger;

		this._detectMessageType(socketWrapper, handshakeData);
		this.emit('connecting', socketWrapper);

		log.debug(logMsg);

		this._authentication(socketWrapper, handshakeData)
			.then((authData) => {
				if (!authData) {
					this._rejectAuth(socketWrapper, 'empty');
				} else if (authData instanceof Error) {
					this._rejectAuth(socketWrapper, authData.toString());
				} else {
					this._registerSocket(socketWrapper, authData);
				}
			})
			.catch(this._onError.bind(this));
	}

	_detectMessageType(socketWrapper, handshakeData) {
		const format = handshakeData.headers['sec-websocket-protocol'] || 'json';

		socketWrapper._messageFormat = format;
		socketWrapper._parser = Parser[format] || this._options.parser;
	}

	_rejectAuth(socketWrapper, reason) {
		const log = this._options.logger;

		log.debug('auth reject with', authData);

		socketWrapper.sendEvent('auth.reject', reason);
		socketWrapper.destroy();
	}

	_registerSocket(socketWrapper, authData) {
		const log = this._options.logger;

		log.debug(`socket connected (${socketWrapper.uid})`);

		socketWrapper.setAuth(true, authData);

		socketWrapper.on('message', this._onMessage.bind(this, socketWrapper));
		socketWrapper.once('close', this._onSocketClose.bind(this, socketWrapper));

		this._sockets.push(socketWrapper);
		this.emit('connected', socketWrapper);
	}

	_onError(err) {
		this._options.logger.error(err);
	}

	_onSocketClose(socketWrapper) {
		const log = this._options.logger;
		const index = this._sockets.indexOf(socketWrapper);

		log.debug(`socket disconnect (${socketWrapper.uid})`);

		this._sockets.splice(index, 1);
		this.emit('disconnect', socketWrapper);
	}

	_onMessage(socketWrapper, message) {

	}
}

module.exports = ServerWrapper;