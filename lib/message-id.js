var _ = require('underscore');

module.exports.generateId = function() {
	return Math.floor(Math.random() * 2e20);
}

module.exports.makeUnanchored = function() {
	return makeId({});
}

module.exports.makeId = function(anchorsToIds) {
	return new MessageId(anchorsToIds);
}

module.exports.makeRootId = function(id, value) {
	var anchorsToIds = {}

	anchorsToIds[id] = value;

	return new MessageId(anchorsToIds);
}



var MessageId = module.exports.MessageId =  function(anchorsToIds) {
	this._anchorsToIds = anchorsToIds;
}

MessageId.prototype.getAnchorsToIds = function() {
	return this._anchorsToIds;
}

MessageId.prototype.getAnchors = function() {
	return _.keys(this._anchorsToIds);
};

MessageId.prototype.getHashCode = function() {
	var hash = null;
	for(var key in this._anchorsToIds) {
		var value = this._anchorsToIds[key] || 0;
		
		hash += key ^ value;
	}
}
