
"use strict"

const Duplex = require('stream').Duplex;

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
	}
	clientSide._write = function _write(chunk, enc, callback){
		if(serverCallback) throw new Error;
		if(typeof callback==='function') serverCallback = callback;
		serverSide.push(chunk);
	}
	clientSide._final = function _final(callback){
		serverSide.on('end', callback);
		serverSide.push(null);
	}
	const serverSide = new Duplex;
	serverSide._read = function _read(){
		if(!serverCallback) return;
		var callback = serverCallback;
		serverCallback = null;
		callback();
	}
	serverSide._write = function _write(chunk, enc, callback){
		if(clientCallback) throw new Error;
		if(typeof callback==='function') clientCallback = callback;
		clientSide.push(chunk);
	}
	serverSide._final = function _final(callback){
		clientSide.on('end', callback);
		clientSide.push(null);
	}
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
			sock.clientSide.write('\r\n');
		}else if(typeof message==='string' || Buffer.isBuffer(message)){
			sock.clientSide.write(message);
		}
		if(typeof body==='string' || Buffer.isBuffer(body)){
			sock.clientSide.write(body);
		}
		server.emit('connection', sock.serverSide);
	});
}
