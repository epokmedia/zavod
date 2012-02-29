var Computation = require('./index').Computation;
var Provider = require('./index').Provider;
var Worker = require('./index').Worker;

//Create and configure a new computation
var c = new Computation({
	timeStep:1, //The number of ms to wait between emits from your providers
	expireTimeout:60000, //The number of ms to wait until a un-acked tuple is considered expired (failed)
	maxPendingInput:10000, //The number of tuple waiting to be acked in your computation (used to throttle your providers)
});

//Any error reported by a worker will be caught here
c.on('error', function(err) {
	console.log(err);
})

//Create and attach a new provider to your computation
c.setProvider('sentenceProvider', new Provider(function(events) {

	var collector = null;
	var sentences = ['hello world', 'zavod says hello', 'the cake is a lie'];

	var newSentence = function() {
		var index = Math.floor(Math.random() * sentences.length);
		return sentences[index];
	}

	//Simple sequence id to track your tuples
	var seqId = 1;

	//The open event is emitted when your provider will have to emit tuples soon
	//This is where you should connect to your data source (zmq, redis, twitter feed, ...)
	//Get the tuple collector function used to emit new tuple
	events.on('open', function(coll) {
		collector = coll;
	});

	//This event is emitted when one of your previously emitted tuple is acked
	//The corresponding tuple has been successfully processed by your computation
	events.on('ack', function(id) {
		//console.log('The tuple#' + id + ' has been acked');
	})

	//This event is emitted when one of your previously emitted tuple has generated an error in
	//your computation.
	events.on('fail', function(id) {
		//console.log('The tuple#' + id + ' has failed');
	})

	//The returned function is the function being called by the computation 
	//at each tick to get a new tuple. You must call the callback because every provider is executed in sequence.
	return function(cb) {
		if (collector) {
			//Here we emit the result of the newSentence function with an associated id (seqId)
			collector(newSentence(), seqId++);
			cb();
		}
	}

}));

c.setWorker('splitSentence', new Worker(function(events) {

	var collector = null;

	//The prepare event is emitted when your worker is going to be used
	//The received outputCollector instance will be used to emit, ack and fail tuples
	events.on('prepare', function(outputCollector) {
		collector = outputCollector;
	});

	//The returned function is our actual execute function
	//This function will be called every time a new tuple is receieved for further processing
	return function(tuple) {

		//Fetch the tuple data (can be anything from string to object)
		var data = tuple.getData();

		//Split the sentence into words
		var words = data.split(' ');

		words.forEach(function(word) {
			//Emit a new tuple for each word
			//The second argument is the anchored tuple(s), to ensure that the original sentence will
			//be acked in our provider
			collector.emit(word, [tuple]);
		});
 		
		collector.ack(tuple);

	}

}));

//Here we define a simple word counter worker which display the stats about count every second
c.setWorker('countWords', new Worker(function(events) {

	var words = {};
	var collector = null;

	events.on('prepare', function(outputCollector) {
		collector = outputCollector;
	});

	setInterval(function() {
		for(var word in words) {
			var count = words[word];
			console.log('The word "' + word + '" has been counted ' + count + ' times');
		}
	}, 1000);

	return function(tuple) {

		var data = tuple.getData();
		if (words[data]) {
			words[data]++;
		} else words[data] = 1;
		

		collector.ack(tuple);
	}

}));


//Link the sentenceProvider with the splitSentence worker
//sentenceProvider will output tuples to splitSentence
c.link('sentenceProvider', 'splitSentence');

//Link splitSentece to the countWords worker
c.link('splitSentence', 'countWords');

//Start your computation
c.start();
