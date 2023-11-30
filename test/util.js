"use strict";

const http = require('http');
const Duplex = require('stream').Duplex;
var inherits = require('util').inherits;

var ServerResponseTransform = require('http-transform').ServerResponseTransform;
var PassThrough = require('http-transform').PassThrough;

var lib = require('../index.js');
const { Route } = lib;

// Make a pair of Duplex streams
// what's written to clientSide is readable from serverSide and vice-versa
function makeDuplexPair() {
	var clientCallback, serverCallback;
	const clientSide = new Duplex;
	clientSide._read = function _read(){
		if(!clientCallback) return;
		var callback = clientCallback;
		clientCallback = null;
		callback();
	};
	clientSide._write = function _write(chunk, enc, callback){
		if(serverCallback) throw new Error;
		if(!chunk.length) return void callback();
		if(typeof callback==='function') serverCallback = callback;
		serverSide.push(chunk);
	};
	clientSide._final = function _final(callback){
		serverSide.on('end', callback);
		serverSide.push(null);
	};
	const serverSide = new Duplex;
	serverSide._read = function _read(){
		if(!serverCallback) return;
		var callback = serverCallback;
		serverCallback = null;
		callback();
	};
	serverSide._write = function _write(chunk, enc, callback){
		if(clientCallback) throw new Error;
		if(!chunk.length) return void callback();
		if(typeof callback==='function') clientCallback = callback;
		clientSide.push(chunk);
	};
	serverSide._final = function _final(callback){
		clientSide.on('end', callback);
		clientSide.push(null);
	};
	return { clientSide, serverSide };
}
module.exports.makeDuplexPair = makeDuplexPair;

// Take an HTTP server and inject a message for it to handle
// This lets you make HTTP requests without having to listen on any socket
module.exports.writeMessage = writeMessage;
function writeMessage(server, message, body){
	return new Promise(function(resolve, reject){
		var sock = makeDuplexPair();
		var parts = [];
		sock.clientSide.on('error', function(err){
			reject(err);
		});
		sock.clientSide.on('data', function(buf){
			parts.push(buf);
		});
		sock.clientSide.on('end', function(){
			// For some reason we can't read the data if we end() immediately after emitting "connection"
			sock.clientSide.end();
			resolve(Buffer.concat(parts));
		});
		// Start reading
		sock.clientSide.resume();
		// An array indicates a list of headers
		if(Array.isArray(message)){
			message.forEach(function(v){
				sock.clientSide.write(v+'\r\n');
			});
			sock.clientSide.write('Connection: close\r\n');
			sock.clientSide.write('\r\n');
		}else if(typeof message==='string' || Buffer.isBuffer(message)){
			sock.clientSide.write(message);
		}
		if(typeof body==='string' || Buffer.isBuffer(body)){
			sock.clientSide.write(body);
		}
		// sock.serverSide.server = server;
		server.emit('connection', sock.serverSide);
		// server.on('clientError', function(err, socket){
		// 	if(socket.writable){
		// 		if(err.code === 'HPE_HEADER_OVERFLOW'){
		// 			socket.write("HTTP/1.1 431 Request Header Fields Too Large\r\n");
		// 			socket.write("Connection: close\r\n");
		// 			socket.write("\r\n");
		// 		}else{
		// 			socket.write("HTTP/1.1 400 Client Error\r\n");
		// 			socket.write("Connection: close\r\n");
		// 			socket.write("\r\n");
		// 		}
		// 	}
		// 	throw err;
		// });
	});
}

module.exports.testMessage = testMessage;
function testMessage(serverOptions, message, body){
	var listener = new lib.HTTPServer(serverOptions);
	var server = http.createServer({requireHostHeader: false}, listener.callback());
	return writeMessage(server, message, body);
}

exports.ToJSONTransform = ToJSONTransform;
inherits(ToJSONTransform, lib.ResponseTransform);
function ToJSONTransform(){
	if(!(this instanceof ToJSONTransform)) return new ToJSONTransform();
	ServerResponseTransform.call(this);
	this.contentType = 'application/json';
	this.sourceContents = '';
}
ToJSONTransform.prototype.name = 'ToJSONTransform';
ToJSONTransform.prototype._transformHead = function _transformHead(headers){
	headers.setHeader('Content-Type', this.contentType);
	return headers;
};
ToJSONTransform.prototype._transform = function _transform(data, encoding, callback){
	this.sourceContents += data;
	callback(null);
};
ToJSONTransform.prototype._flush = function (callback){
	const self = this;
	self.push(JSON.stringify(this.sourceContents)+"\r\n");
	callback();
};

module.exports.URIReflect = URIReflect;
inherits(URIReflect, Route);
function URIReflect(uriTemplate, resourceList){
	this.uriTemplate = uriTemplate;
	this.resourceList = resourceList;
	Route.call(this);
}
URIReflect.prototype.prepare = function prepare(uri){
	// If uriTemplate is defined, then only return resources matching that template
	if(this.uriTemplate && !this.matchUri(uri)) return Promise.resolve();
	// Discard the matched parameters
	if(uri.uri) uri = uri.uri;
	// If resourceList is set, then only return resources named in that array
	if(this.resourceList && this.resourceList.indexOf(uri)<0) return Promise.resolve();
	return Promise.resolve(new lib.Resource(this, {}, {
		uri: uri,
		contentType: 'text/plain',
	}));
};
URIReflect.prototype.render = function(resource){
	var res = new PassThrough;
	res.setHeader('Content-Type', resource.contentType);
	res.setHeader('Content-Length', resource.uri.length+2+'');
	res.end(resource.uri+'\r\n');
	return res;
};
URIReflect.prototype.listing = async function(){
	return this.resourceList.map( (uri)=>this.prepare(uri) );
};
