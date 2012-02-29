var mocha = require('mocha');
var should = require('should');
var util = require('util');
var bitXorVals = require('../lib/utils.js').bitXorVals;

describe('bitXorVals', function() {

	it('should return 0 with invalid value', function(){
		bitXorVals(null).should.equal(0);
		bitXorVals(undefined).should.equal(0);
	});

	it('should return 0 with empty array', function(){
		bitXorVals([]).should.equal(0);
	});

	it('should return value with only one values', function(){
		bitXorVals([222]).should.equal(222);
	});
	
	it('should return 0 with two equal values', function(){
		bitXorVals([1, 1]).should.equal(0);
	});

	it('should not return 0 with two different values', function(){
		bitXorVals([1, 2]).should.not.equal(0);
	});

	it('should not return 0 with two equal values and one different value', function(){
		bitXorVals([2, 1, 2]).should.not.equal(0);
	});

	it('should return 0 with two equal values and two other equal values', function(){
		bitXorVals([2, 1, 2, 1]).should.equal(0);
	});

	it('should work with string', function() {

		var a = '200000';
		var b = '200001';

		bitXorVals([a, b]).should.not.equal(0);
		bitXorVals([a, a]).should.equal(0);
		bitXorVals([b, b]).should.equal(0);
		bitXorVals([b, b, a]).should.not.equal(0);
	});


	it('should raise error with invalid type', function() {
		(function() { bitXorVals([new Date(), 1, 2]) }).should.throw();
	})
});
