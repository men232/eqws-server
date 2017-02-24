const ApiError = require('../ApiError');

class Context {
	constructor(socket, request) {
		this.socket  = socket;
		this.body    = null;
		this.state   = {};
		this.payload = {};
		this.respond = false;
		this.status  = 200;
		this.lifettl = (new Date()).getTime();
		this.logger  = socket._options.logger;
		this.route   = null;
	}

	parseRequest(request) {
		if (typeof request !== 'object') {
			throw new ApiError('INCORRECT_PARAMS');
		} else if (!request.method) {
			throw new ApiError('UNKNOW_API_METHOD');
		} else if (!request.sid) {
			throw new ApiError('INCORRECT_PARAMS', 'Incorrect sid');
		}

		this.request = request;
		this.sid     = this.request.sid;
		this.path    = this.request.method;
		this.url     = this.request.method;

		// Extend request object
		this.request.protocol = 'ws';
		this.request.ip       = this.socket._handshakeData.remoteAddress;
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
		this.socket.send(this.body);
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