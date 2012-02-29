var Tuple = require('./tuple').Tuple;

var Collector = module.exports.Collector = function() {
	this._pendingAcks = {};
}

Collector.prototype.emit = function(data, anchors) {
}


Collector.prototype.ack = function(tuple) {
}


Collector.prototype.fail = function(tuple) {
}


Collector.prototype.reportError = function(error) {
}


Collector.prototype._putXor = function(collection, key, id) {
	if (key instanceof Tuple) key = key.getId();

	var curr = collection[key] || 0;
	collection[key] = curr ^ id;
};
