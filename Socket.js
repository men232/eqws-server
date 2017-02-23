const base64id = require('base64id');
const msgpack  = require('./msgpack');
const EventEmitter = require('events');

module.exports = function(server) {
	this.rooms  = [];
	this.id     = base64id.generateId();
	this.server = server;

	this.sendEvent = sendEvent;
	this.join      = join;
	this.leave     = leave;
	this.hasRoom   = hasRoom;

	this.encode = encode;
	this.decode = decode;

	// Wrap events
	let eventSystem = new EventEmitter();

	this.on('message', eventSystem.emit.bind(eventSystem, 'message'));
	this.on('close', eventSystem.emit.bind(eventSystem, 'close'));

	this.eventSystem = eventSystem;
};

function sendEvent(event, args) {
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
		return msgpack.encode(data);
	} else {
		return JSON.stringify(data);
	}
}

function decode(data) {
	if (typeof data !== 'string') {
		return msgpack.decode(data);
	} else {
		return JSON.parse(data);
	}
}

function hasRoom(roomId) {
	return this.rooms.indexOf(roomId) >= 0;
}