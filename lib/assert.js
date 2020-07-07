"use strict";

const coreAssert = require('assert');
const assert = coreAssert.bind();
// Include the core Node.js assert along with our own functions
Object.setPrototypeOf(assert, coreAssert);

module.exports = assert;

const lib = require('../index.js');
const http = require('http');
const stream = require('stream').Stream;

assert.isWritableRequest = function isWritableClientRequest(res){
	assert(res instanceof stream.Stream);
	// assert(res instanceof http.ClientRequest);
	assert(typeof res.on === 'function');
	assert(typeof res.write === 'function');
	assert(typeof res.setHeader === 'function');
};

assert.isReadableRequest = function isReadableServerRequest(req){
	assert(req instanceof stream.Stream);
	// assert(req instanceof http.IncomingMessage);
	assert(typeof req.on === 'function');
	assert(typeof req.read === 'function');
};

assert.isWritableResponse = function isWritableClientResponse(res){
	assert(res instanceof stream.Stream);
	// assert(res instanceof http.ServerResponse);
	assert(typeof res.on === 'function');
	assert(typeof res.write === 'function');
	assert(typeof res.setHeader === 'function');
};

assert.isReadableResponse = function isReadableClientResponse(req){
	assert(req instanceof stream.Stream);
	// assert(req instanceof http.IncomingMessage);
	assert(typeof req.on === 'function');
	assert(typeof req.read === 'function');
};

assert.isRoute = function assertIsRoute(req){
	assert(req instanceof lib.Route);
};

assert.isResource = function assertIsResource(req){
	assert(req instanceof lib.Resource);
};
