const base64id = require('base64id');
const PSON     = require('pson');

const pson = new PSON.StaticPair([]);

module.exports = function(server) {
	this.rooms  = [];
	this.id     = base64id.generateId();
	this.server = server;

	this.emit = emit;
	this.join = join;
	this.leave = leave;

	this.encode = encode;
	this.decode = decode;
};

function emit(event, args) {
	let data = this.encode({event, args});
	this.send(data);

	return this;
}

function join(roomId) {
	this.server.to(roomId).join(this);
}

function leave(roomId) {
	this.server.leave(roomId, this);
}

function encode(data, binary) {
	if (binary) {
		return pson.encode(data).buffer;
	} else {
		return JSON.stringify(data);
	}
}

function decode(data) {
	if (typeof req !== 'string') {
		let ds = pson.decode(data);
		return ds;
	} else {
		return JSON.parse(data);
	}
}