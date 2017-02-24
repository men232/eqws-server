const msgpack = require('./msgpack');

const binary = {
	encode: (data) => {
		return msgpack.encode(data);
	},

	decode: (data) => {
		return msgpack.decode(data);
	}
}

const json = {
	encode: (data) => {
		return JSON.stringify(data);
	},

	decode: (data) => {
		return JSON.parse(data);
	}
}

module.exports = {binary, json};