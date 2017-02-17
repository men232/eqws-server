const ApiError = require('./ApiError');

class Context {
	constructor(socket) {
		this.socket  = socket;
		this.body    = null;
		this.state   = {};
		this.payload = {};
		this.respond = false;
		this.status  = 200;
		this.lifettl = (new Date()).getTime();
		this.logger  = socket.server.logger;
		this.binary  = false;
	}

	parseRequest(req) {
		if (typeof req !== 'string') {
			this.binary = true;
		}

		this.request = this.socket.decode(req);
		this.sid     = this.request.sid;
		this.path    = this.request.method;
		this.url     = this.request.method;

		// Extend request object
		this.request.protocol = 'ws';
		this.request.ip       = this.socket._socket.remoteAddress;
	}

	throw(code, msg) {
		throw new ApiError(code, msg);
	}

	send() {
		if (this.respond) {
			throw new Error('Allready responded');
		}

		this.respond = true;
		this.body.sid = this.sid;

		let data = this.socket.encode(this.body, this.binary);
		this.socket.send(data);
	}

	errorHandler(err) {
		if (typeof err === 'number') {
			err = new ApiError(err);
		}

		this.logger.error(err);
		this.status = 500;
		this.body = {
			error_code: 500,
			error_msg: err.toString()
		};
	}

	onerror(err) {
		this.errorHandler(err);
		this.send();
	}
}

module.exports = Context;