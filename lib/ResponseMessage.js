"use strict";

/*
Represents an HTTP message - either inbound or outbound, readable or writable
It is a Stream (and/or has a `body` property) with associated headers.
*/

var inherits = require('util').inherits;

var assert = require('./assert.js');
var Headers = require('http-transform').Headers;
var ResponsePassThrough = require('http-transform').ResponsePassThrough;

exports.ResponseMessage = ResponseMessage;
inherits(ResponseMessage, Headers);
function ResponseMessage(){
	Headers.call(this);
}

ResponseMessage.fromStream = function fromStream(res){
	assert.isReadableResponse(res);
	return new Promise(function(resolve, reject){
		var msg = new ResponseMessage(res);
		var parts = [], len = 0;
		res.once('readable', function(){
			res.pipeHeaders(msg);
		});
		res.on('readable', function(){
			var data;
			while(null !== (data=res.read())){
				parts.push(data);
				len += data.length;
			}
		});
		res.on('end', function(){
			msg.body = Buffer.concat(parts, len).toString();
			resolve(msg);
		});
		res.on('error', reject);
	});
};

ResponseMessage.prototype.stream = function stream(){
	const res = new ResponsePassThrough;
	assert(this.body && typeof this.body.length === 'number');
	this.pipeHeaders(res);
	res.flushHeaders();
	res.end(this.body);
	return res.clientReadableSide;
};

Object.defineProperty(ResponseMessage.prototype, 'readableSide', {get:ResponseMessage.prototype.stream});

ResponseMessage.prototype.pipe = function pipe(dst){
	dst.end(this.body);
};

ResponseMessage.prototype.pipeMessage = function pipeMessage(dst){
	this.pipeHeaders(dst);
	dst.end(this.body);
};
