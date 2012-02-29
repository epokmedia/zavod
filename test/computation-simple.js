var mocha = require('mocha');
var should = require('should');
var util = require('util');


var Computation = require('../index').Computation;
var Provider = require('../index').Provider;
var Worker = require('../index').Worker;

describe('wrong computation', function() {

	it('should throw if no components attached', function() {
		(function() {
			var c = new Computation();
			c.start();
		}).should.throw();
	})

	it('should throw if no provider attached', function() {
		(function() {
			var c = new Computation();
			c.setWorker('foobar', new Worker());
			c.start();
		}).should.throw();
	})

	it('should throw if invalid link declared', function() {
		(function() {
			var c = new Computation();
			c.link('unknown', 'unknown');
		}).should.throw();

		(function() {
			var c = new Computation();
			c.setWorker('w', new Worker());
			c.setProvider('p', new Provider());
			c.link('w', 'p');
		}).should.throw();

		(function() {
			var c = new Computation();
			c.setProvider('p', new Provider());
			c.link('p', 'w');
		}).should.throw();
	})
});

describe('computation with empty provider and worker', function() {

	it('can be started then stopped', function(done) {
		var c = new Computation();
		c.setWorker('w', new Worker());
		c.setProvider('p', new Provider());
		c.link('p', 'w');
		c.on('error', done);
		c.on('stop', done);
		c.start();
		c.stop();
	});

});


describe('simple computation', function() {

	it('should behave correctly', function(done) {

		var c = new Computation();
		c.on('stop', done);
		c.on('error', done);

		c.setProvider('p', new Provider(function(events) {

			var collector = null;
			var counter = 1;

			events.on('open', function(coll) {
				collector = coll;
			});

			events.on('ack', function(id) {
				if (id === 10) c.stop();
			})


			events.on('fail', function(id) {
				done('input with id : ' + id + ' has failed');
			})

			return function(cb) {
				if (collector) {
					collector('foo', counter++);
					collector('bar', counter++);
					cb();
				}
			}

		}));

		c.setWorker('w1', new Worker(function(events) {

			var collector = null;

			events.on('prepare', function(c) {
				collector = c;
			});

			return function(tuple) {

				var data = tuple.getData();
				var out = '';

				if (data === 'foo') {
					out = 'foobar';
				} else if (data === 'bar') {
					out = 'barfoo';
				}

		 		collector.emit(out, [tuple]);
				collector.ack(tuple);

			}

		}));

		c.setWorker('w2', new Worker(function(events) {

			var collector = null;

			events.on('prepare', function(c) {
				collector = c;
			});

			return function(tuple) {

				var d = tuple.getData();
				(d === 'foobar' || d === 'barfoo').should.be.true;

				collector.ack(tuple);

			}

		}));

		c.link('p', 'w1');
		c.link('w1', 'w2');

		c.start();

	});

});



describe('simple computation with one failed tuple', function() {

	it('should behave correctly', function(done) {
	
		var c = new Computation();
		c.on('stop', done);
		c.on('error', done);

		c.setProvider('p', new Provider(function(events) {

			var collector = null;
			var counter = 1;

			events.on('open', function(coll) {
				collector = coll;
			});

			events.on('ack', function(id) {
				
			})

			events.on('fail', function(id) {
				if (id === 5) c.stop();
				else done('invalid tuple failed');
			})

			return function(cb) {
				if (collector) {
					collector('foo', counter++);
					cb();
				}
			}

		}));

		c.setWorker('w1', new Worker(function(events) {

			var collector = null;
			var counter = 1;

			events.on('prepare', function(c) {
				collector = c;
			});

			return function(tuple) {

				if (counter++ === 5) {
					collector.fail(tuple);
				} else {
					collector.ack(tuple);
				}

			}

		}));

		c.link('p', 'w1');

		c.start();

	});

});