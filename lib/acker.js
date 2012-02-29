var util = require('util');
var EventEmitter = require('events').EventEmitter;

var _ = require('underscore');

var Acker = module.exports.Acker = function(expireTimeout) {
	var pending = this._pending = {};
	this._ackExpireTimeout = expireTimeout;

	setInterval(function() {
		_.each(pending, function(entry, id) {
			if (entry.timestamp+expireTimeout < Date.now()) {
				delete entry[id];
			}
		});
	}, expireTimeout);

	EventEmitter.call(this);
}

util.inherits(Acker, EventEmitter);


Acker.prototype.ack = function(rootId, val) {
	var entry = this._pending[rootId] || null;
	if (!entry) return;

	this._updateAck(entry, val);

	this._checkAckComplete(rootId);
};


Acker.prototype.init = function(rootId, val) {

	var entry = {
		timestamp:Date.now()
	};

	this._updateAck(entry, val);
	
	this._pending[rootId] = entry;

	this._checkAckComplete(rootId);
};


Acker.prototype.fail = function(rootId) {
	var entry = this._pending[rootId] || null;
	if (!entry) return;

	entry.failed = true

	this._checkAckComplete(rootId);
}


Acker.prototype._updateAck = function(entry, val) {
	var oldVal = entry.val || 0;
	entry.val = val ^ entry.val;
};


Acker.prototype._checkAckComplete = function(id) {
	
	var entry = this._pending[id];
	var deleteEntry = false;

	if (entry.failed) {
		this.emit('fail', id);
		deleteEntry = true;
	} else if (entry.val === 0) {
		this.emit('ack', id);
		deleteEntry = true;
	}

	if (deleteEntry) delete this._pending[id];
};