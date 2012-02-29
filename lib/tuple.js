var makeUnanchored = require('./message-id').makeUnanchored;
var MessageId = require('./message-id').MessageId;

var Tuple = module.exports.Tuple = function(data, messageId) {
	this._data = data;
	this._messageId = (!messageId || !(messageId instanceof MessageId))
							? makeUnanchored()
							: messageId;
}


Tuple.prototype.getMessageId = function() {
	return this._messageId;
};

Tuple.prototype.getId = function() {
	return this._messageId.getHashCode();
};

Tuple.prototype.getData = function() {
	return this._data;
};