const path = require('path');
const msgpack = require('msgpack-lite');

const MSGPACK_CODEC = msgpack.createCodec({
	binarraybuffer: true,
	preset: true
});

try {
	const mongoose = require(path.join(process.cwd(), 'node_modules', 'mongoose'));
	const ObjectId = mongoose.Types.ObjectId;

	MSGPACK_CODEC.addExtPacker(0x3F, ObjectId, (value) => {
		return msgpack.encode(value.toString());
	});
} catch (err) {}

function encode(data) {
	return msgpack.encode(data, {codec: MSGPACK_CODEC}).buffer;
}

function decode(data) {
	return msgpack.decode(new Uint8Array(data), {codec: MSGPACK_CODEC});
}

module.exports = {
	encode,
	decode,
	interface: msgpack,
	codec: MSGPACK_CODEC
}