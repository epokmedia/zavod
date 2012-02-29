var _ = require('underscore');

var bitXorVals = module.exports.bitXorVals = function(values) {
	if (!values) values = [];

	var out = _.reduce(values, function(memo, val) {

		if (Array.isArray(val)) {
			val = val.join('');
		}

		if (typeof val === 'string') {
			val = parseInt(val);
		}

		if (typeof val !== 'number') throw new Error('Array of Numbers is expected')

		return memo ^ val;
	
	}, 0);

	return out;
}