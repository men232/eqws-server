const ApiError = require('./ApiError');

class Context {
	constructor(socket, req) {
		this.socket  = socket;
		this.request = JSON.parse(req);
		this.body    = null;
		this.sid     = this.request.sid;
		this.state   = {};
		this.path    = this.request.method;
		this.url     = this.request.method;
		this.payload = {};
		this.respond = false;
		this.status  = 200;
		this.lifettl = (new Date()).getTime();
		this.logger  = socket.server.logger;

		// Extend request object
		this.request.protocol = 'ws';
		this.request.ip       = socket._socket.remoteAddress;
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
		this.socket.send(JSON.stringify(this.body));
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