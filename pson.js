const PSON = require('pson');
const pson = new PSON.StaticPair([]);

const _encodeValue = pson.encoder._encodeValue;

pson.encoder._encodeValue = function (val) {
	if (val && val._bsontype) {
		arguments[0] = val.toString();
	}

	_encodeValue.apply(this, arguments);
}

module.exports = pson;