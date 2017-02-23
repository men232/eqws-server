const compose = require('koa-compose');
const Context = require('./Context');
const ApiError = require('./ApiError');

class Router {
	constructor() {
		this.stack       = {};
		this.middlewares = [];
		this.init = this.init.bind(this);
	}

	define(method, handler) {
		if (arguments.length === 2) {
			this.stack[method] = {handler};
		} else {
			let opts = method;

			this.stack[opts.path] = opts;
		}
	}

	init(socket) {
		socket.eventSystem.on('message', this.controller.bind(this, socket));
	}

	use(fn) {
		this.middlewares.push(fn);
	}

	controller(socket, req) {
		let ctx = new Context(socket);

		try {
			ctx.parseRequest(req);
		} catch (err) {
			ctx.onerror(101);
			return;
		}

		let route = this.match(ctx.path);
		ctx.__route = route;

		if (!route) {
			let err = ApiError.incorrectMethod(ctx.path);
			return ctx.onerror(err);
		}

		let middlewares = this.middlewares.concat(route.handler);
		let fn = compose(middlewares);
		fn(ctx)
			.then(() => ctx.send())
			.catch((err) => ctx.onerror(err));
	}

	match(path) {
		return this.stack[path];
	}
}

module.exports = Router;