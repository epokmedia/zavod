var EventEmitter = require('events').EventEmitter;

var Provider = module.exports.Provider = function(fn) {
	this._inputCollector = null;
	this._definitionFunction = fn || function() {};

	this._eventEmitter = new EventEmitter();
	this._nextTupleFunction = this._definitionFunction(this._eventEmitter) || function(cb) { cb(); };
}

Provider.prototype.open = function(inputCollector) {
	this._inputCollector = inputCollector;

	this._eventEmitter.emit('open', inputCollector);
};

Provider.prototype.close = function() {
	this._inputCollector = null;

	this._eventEmitter.emit('close');
};


Provider.prototype.ack = function(id) {
	this._eventEmitter.emit('ack', id);
};


Provider.prototype.fail = function(id) {
	this._eventEmitter.emit('fail', id);
};


Provider.prototype.nextTuple = function(cb) {
	if (!this._inputCollector) return;

	this._nextTupleFunction(cb);
};