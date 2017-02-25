const EventEmitter = require('events').EventEmitter;
const msgpack = require('msgpack-lite');

class ClusterAdapter extends EventEmitter {
	constructor(opts = {}) {
		super();

		if (!opts.chanelName) opts.chanelName = 'eq.chanel';

		this._options = opts;
		this._sub = opts.sub;
		this._pub = opts.pub;
	}

	init(ws, opts) {
		if (!this._options.logger) this._options.logger = opts.logger;

		this._ws = ws;

		this.on('message', this._onMessage.bind(this));
		this._ws.on('connecting', this._onConnecting.bind(this));

		this._defineListener();
		this._subscribe();

		process.nextTick(() => {
			this._ws.emit('clusterInitialized', this);
		});

		ws.broadcast = this.broadcast.bind(this);
	}

	broadcast() {
		const chanelName = this._options.chanelName;
		const args = Array.prototype.slice.call(arguments);
		const uid = this._ws.uid;
		const log = this._options.logger;

		args.unshift(uid);
		let data = JSON.stringify(args);

		log.debug('broadcast redis', args);
		this._pub.publish(chanelName, data);
	}

	_onMessage(args) {
		this._ws.emit.apply(this._ws, args);
	}

	_onConnecting(socket) {
		//socket.on('authorized', this.broadcast.bind(this, 'authorized'));
		//socket.on('unauthorized', this.broadcast.bind(this, 'unauthorized'));
	}

	_defineListener() {
		const chanelName = this._options.chanelName;

		this._sub.on('message', (channel, message) => {
			if (channel !== chanelName) return;

			const log = this._options.logger;
			const args = JSON.parse(message);
			const uid = args.shift();

			// Ignore same uid
			if (this._ws.uid === uid) return;

			this.emit('message', args);
		});
	}

	_subscribe() {
		const log = this._options.logger;
		const chanelName = this._options.chanelName;

		this._sub.subscribe(chanelName, (err, count) => {
			if (err) {
				log.error(err);
				setTimeout(() => this._subscribe(), 5000);
				return;
			}

			log.debug('redis subscribed');
			this.emit('subscribed');
		});
	}
}

module.exports = ClusterAdapter;