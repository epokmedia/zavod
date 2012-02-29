var EventEmitter = require('events').EventEmitter;

var Worker = module.exports.Worker = function(fn) {
	this._outputCollector = null;
	this._definitionFunction = fn || function() {};

	this._eventEmitter = new EventEmitter();
	this._executeFunction = this._definitionFunction(this._eventEmitter) || function() {};
}

Worker.prototype.prepare = function(outputCollector) {
	this._outputCollector = outputCollector;
	
	this._eventEmitter.emit('prepare', outputCollector);
};

Worker.prototype.cleanup = function() {
	this._eventEmitter.emit('cleanup');
};


Worker.prototype.execute = function(tuple) {
	this._executeFunction(tuple);
};
