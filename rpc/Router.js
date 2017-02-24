const compose = require('koa-compose');
const Context = require('./Context');
const ApiError = require('../ApiError');

class Router {
	constructor() {
		this._methods = {};
		this._middlewares = [];

		this.init = this.init.bind(this);
	}

	define(method, handler) {
		if (arguments.length > 1) {
			this._methods[method] = { handler };
		} else {
			let opts = method;
			this._methods[opts.path] = opts;
		}
	}

	init() {
		return this._controller.bind(this);
	}

	use(fn) {
		this._middlewares.push(fn);
	}

	match(path) {
		return this._methods[path];
	}

	_controller(socket, request) {
		const ctx = new Context(socket);

		try {
			ctx.parseRequest(request);
		} catch (err) {
			return ctx.onerror(err);
		}

		const route = this.match(ctx.path);

		if (!route) {
			let err = ApiError.incorrectMethod(ctx.path);
			return ctx.onerror(err);
		}

		ctx.route = route;

		let way = this._middlewares.concat(route.handler);
		let fn = compose(way);

		fn(ctx)
			.then(() => ctx.send())
			.catch((err) => ctx.onerror(err));
	}
}

module.exports = Router;