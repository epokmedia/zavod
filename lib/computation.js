var util = require('util');
var EventEmitter = require('events').EventEmitter;

var _ = require('underscore');
var async = require('async');

var Acker = require('./acker').Acker;
var Tuple = require('./tuple').Tuple;
var Collector = require('./collector').Collector;

var makeRootId = require('./message-id').makeRootId;
var makeUnanchored = require('./message-id').makeUnanchored;
var generateId = require('./message-id').generateId;
var makeId = require('./message-id').makeId;
var bitXorVals = require('./utils').bitXorVals;

var Computation = module.exports.Computation = function(options) {
	this._options = options || {};
	this._providers = {};
	this._workers = {};

	this._components = {};

	this._acker = null;

	this._pendingInputs = {};

	this._isRunning = false;

	this._timeStep = this._options['timeStep'] || 1;
	this._ackExpireTimeout = this._options['expireTimeout'] || 60000;
	this._checkExpiredLoop = null;

	this._maxPendingInput = this._options['maxPendingInput'] || 10000;


	EventEmitter.call(this);
}

util.inherits(Computation, EventEmitter);

Computation.prototype.start = function() {
	if (_.size(this._components) === 0) throw new Error('No components attached');
	if (_.size(this._providers) === 0) throw new Error('No providers attached');


	var self = this;
	this._isRunning = true;
	this._acker = new Acker(this._ackExpireTimeout);


	this._setupAcker(this._acker);

	_.each(this._providers, function(provider) {
		self._openProvider(provider);
	});

	_.each(this._workers, function(worker) {
		self._prepareWorker(worker);
	});


	this._checkExpiredLoop = setInterval(function() {
		self._checkExpired();
	}, Math.round(this._ackExpireTimeout/2));


	var mainLoop = null;
	var mainLoopFunction = function() {

		if (self._isRunning) {
			
			if (self._maxPendingInput < _.size(self._pendingInputs)) {
				self.emit('throttle');

				mainLoop = setTimeout(mainLoopFunction, self._timeStep);
				return;
			}

			async.forEachSeries(_.values(self._providers), function(provider, cb) {
			
				provider.instance.nextTuple(cb);

			}, function(err) {
		
				if (err) self.emit('error', err);
				
				mainLoop = setTimeout(mainLoopFunction, self._timeStep);
			});

		} else {

			clearTimeout(mainLoop);
			self._cleanup();

			self.emit('stop');
		}

	};

	mainLoopFunction();

};

Computation.prototype.stop = function() {
	if (!this.isRunning()) return;

	this._isRunning = false;
};


Computation.prototype.setProvider = function(name, provider) {
	if (this._isRunning) throw new Error('Cannot alter components while running');

	this._components[name] = {
		name:name,
		instance:provider,
		outputs:[]
	};

	this._providers[name] = this._components[name];

	return this;
};


Computation.prototype.setWorker = function(name, worker) {
	if (this._isRunning) throw new Error('Cannot alter components while running');

	this._components[name] = {
		name:name,
		instance:worker,
		inputs:[],
		outputs:[]
	};

	this._workers[name] = this._components[name];


	return this;
};


Computation.prototype.link = function(from, to) {
	if (from === to) throw new Error('Cannot link a component to itself');
	if (this._isRunning) throw new Error('Cannot alter components while running');
	if (this._providers[to]) throw new Error('A provider cannot have any input');
	if (!this._components[to]) throw new Error('Component "' + to + '" is invalid');
	if (!this._components[from]) throw new Error('Component "' + from + '" is invalid');
	
	this._components[from].outputs.push(to)
	this._components[to].inputs.push(from);

	return this;
} 

Computation.prototype.isRunning = function() {
	return this._isRunning;
};

Computation.prototype._cleanup = function() {
	_.each(this._providers, function(provider) {
		provider.instance.close();
	});

	_.each(this._workers, function(worker) {
		worker.instance.cleanup();
	});
};

Computation.prototype._openProvider = function(providerContext) {

	var self = this;
	var providerOutputs = providerContext.outputs;
	var providerName = providerContext.name;

	var emitFunction = function(data, providerMessageId) {
	
		var rooted = !!providerMessageId;
		var messageId = null;
		var tuple = null;


		var rootId = generateId();
		var outIds = [];
		var outTuples = [];

		providerOutputs.forEach(function(componentName) {
			outIds.push(generateId());
		});

		outIds.forEach(function(id) {

			if (rooted) {
				messageId = makeRootId(rootId, id);
			} else {
				messageId = makeUnanchored();
			}

			outTuples.push(new Tuple(data, messageId));

		});

		if (rooted) {
			self._pendingInputs[rootId] = {
				timestamp:Date.now(),
				id:providerMessageId,
				data:data,
				providerName:providerName
			}
		}


		//send init ack to acker
		self._acker.init(rootId, bitXorVals(outIds));

		//send tuples to connected workers
		providerOutputs.forEach(function(outputName, i) {
			self._transferTuple(outputName, outTuples[i]);
		});
	};

	providerContext.instance.open(emitFunction);
};

Computation.prototype._prepareWorker = function(workerContext) {
	
	var self = this;
	
	var outWorkers = workerContext.outputs;

	var CustomCollector = function() {
		Collector.call(this);
	}

	util.inherits(CustomCollector, Collector);
	
	CustomCollector.prototype.emit = function(data, anchors) {

		var pendingAcks = this._pendingAcks;
		var putXor = this._putXor;

		outWorkers.forEach(function(workerName) {

			var anchorToIds = {};
			_.each(anchors, function(a) {
				var edgeId = generateId();

				putXor(pendingAcks, a, edgeId);

				a.getMessageId().getAnchors().forEach(function(rootId) {
					putXor(anchorToIds, rootId, edgeId);
				});

			});

			self._transferTuple(workerName, new Tuple(data, makeId(anchorToIds)));

		});	
	};

	CustomCollector.prototype.ack = function(tuple) {
		var ackVal = this._pendingAcks[tuple.getId()] || 0;
		_.each(tuple.getMessageId().getAnchorsToIds(), function(id, rootId) {
			self._acker.ack(rootId, id ^ ackVal);
		});

		delete this._pendingAcks[tuple.getId()];
	};

	CustomCollector.prototype.fail = function(tuple) {
		var ackVal = this._pendingAcks[tuple.getId()] || 0;
		_.each(tuple.getMessageId().getAnchors(), function(rootId) {
			self._acker.fail(rootId);
		});

		delete this._pendingAcks[tuple.getId()];
	};


	CustomCollector.prototype.reportError = function(error) {
		self.emit('error', error);
	}

	var customCollectorInstance = new CustomCollector();

	workerContext.instance.prepare(customCollectorInstance);
} 

Computation.prototype._setupAcker = function(acker) {

	var self = this;

	var ackOrFailPendingInput = function(success, rootId) {
		var input = self._pendingInputs[rootId];
		if (input) {
			var providerInstance = self._providers[input.providerName].instance;
			
			if (success) providerInstance.ack(input.id);
			else providerInstance.fail(input.id);

			delete self._pendingInputs[rootId];
		}
	}

	acker.on('ack', function(rootId) {
		ackOrFailPendingInput(true, rootId);
	});

	acker.on('fail', function(rootId) {
		ackOrFailPendingInput(false, rootId);
	});

};

Computation.prototype._checkExpired = function() {
	var self = this;

	_.each(this._pendingInputs, function(input, rootId) {
		expired = (Date.now() > (input.timestamp+self._ackExpireTimeout));

		if (expired) {
			self._acker.fail(rootId);
		}

	});

};

Computation.prototype._transferTuple = function(componentName, tuple) {
	
	var workerContext = this._workers[componentName];
	if (!workerContext) return;

	workerContext.instance.execute(tuple);
};