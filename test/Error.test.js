"use strict";

const assert = require('assert');
const errors = require('../lib/Error.js').errors;

describe('Error', function(){
	it('400 Client Error', function(){
		var err = new errors.ClientError("Missing a required header");
		assert.match(err.name, /Client Error/);
		assert.match(err.toString(), /Missing a required header/);
		assert.strictEqual(err.statusCode, 400);
	});
	it('404 Not Found', function(){
		var err = new errors.NotFound({uri: 'http://example.com/foo'});
		assert.match(err.toString(), /<http:\/\/example\.com\/foo>/);
		assert.match(err.name, /Not Found/);
		assert.strictEqual(err.statusCode, 404);
	});
	it('405 Method Not Allowed', function(){
		var err = new errors.MethodNotAllowed({uri: 'http://example.com/foo', method: 'BAR'});
		assert.match(err.toString(), /<http:\/\/example\.com\/foo>/);
		assert.match(err.toString(), /does not implement the BAR method/);
		assert.match(err.name, /Method Not Allowed/);
		assert.strictEqual(err.statusCode, 405);
	});
	it('500 Server Error', function(){
		var err = new errors.ServerError("Server broke");
		assert.match(err.name, /Server Error/);
		assert.match(err.toString(), /Server broke/);
		assert.strictEqual(err.statusCode, 500);
	});
	it('501 Not Implemented', function(){
		var err = new errors.NotImplemented({method: 'FOOBAR'});
		assert.match(err.name, /Not Implemented/);
		assert.match(err.toString(), /Server does not implement the FOOBAR HTTP method/);
		assert.strictEqual(err.statusCode, 501);
	});
	it('argument substitution', function(){
		var err = new errors.ClientError("{foo} {bar}", {foo: "bar"});
		assert.match(err.toString(), /bar {bar}/);
		assert.strictEqual(err.statusCode, 400);
	});
});
