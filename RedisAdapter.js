const msgpack = require('msgpack-lite');

class RedisAdapter {
	constructor(wss, opts) {
		this.wss    = wss;
		this.logger = wss.logger;
		this.pub    = opts.pub;
		this.sub    = opts.sub;

		this.sub.on('message', (channel, message) => {
			if (channel !== 'eq.event') return;

			let args = JSON.parse(message);
			let uid = args.shift();

			// Ignore same
			if (this.wss.uid === uid) return;

			this.logger.debug('receive redis', args);

			args.push(true);
			this.wss.broadcast.apply(this.wss, args);
		});

		this.subscribe();
	}

	subscribe() {
		this.sub.subscribe('eq.event', (err, count) => {
			if (err) {
				return this.logger.error(err);
				setTimeout(() => this.subscribe(), 5000);
			}

			this.logger.debug('redis subscribed');
		});
	}

	publish(roomId, event, args) {
		let data = JSON.stringify([this.wss.uid, roomId, event, args]);

		this.logger.debug('publish redis', args);
		this.pub.publish('eq.event', data);
	}
}

module.exports = RedisAdapter;