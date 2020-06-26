"use strict";

/*
Represents an HTTP message - either inbound or outbound, readable or writable
It is a Stream (and/or has a `body` property) with associated headers.
*/

var inherits = require('util').inherits;

var Headers = require('http-transform').Headers;
var ResponsePassThrough = require('http-transform').ResponsePassThrough;

exports.ResponseMessage = ResponseMessage;
inherits(ResponseMessage, Headers);
function ResponseMessage(){
	Headers.call(this);
}

ResponseMessage.fromStream = function fromStream(res){
	return new Promise(function(resolve, reject){
		var msg = new ResponseMessage(res);
		var parts = [], len = 0;
		res.on('readable', function(){
			var data;
			while(null !== (data=res.read())){
				parts.push(data);
				len += data.length;
			}
		});
		res.on('end', function(){
			msg.body = Buffer.concat(parts, len);
			resolve(msg);
		});
		res.on('error', reject);
	});
};

ResponseMessage.prototype.stream = function stream(){
	const res = new ResponsePassThrough;
	this.pipeHeaders(res);
	res.end(this.body);
	return res.clientReadableSide;
};

ResponseMessage.prototype.pipe = function pipe(dst){
	this.pipeHeaders(dst);
	dst.end(this.body);
};
