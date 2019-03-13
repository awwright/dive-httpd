
var assert = require('assert');
var stream = require('stream');

var u = require('./util.js');

describe('meta-test for util', function(){
	describe('PassThrough works this way in Node.js right?', function(){
		it('writes are read', function(){
			var s = new stream.PassThrough();
			s.end('x');
			assert.strictEqual(s.read(1).toString(), 'x');
		});
		it('close is read', function(done){
			var s = new stream.PassThrough();
			// Gotta resume the stream otherwise the end event will be waiting in queue
			s.resume();
			s.end();
			s.on('end', done);
		});
	});
	describe('makeDuplexPair', function(){
		it('writes on client are read by server', function(){
			var pair = u.makeDuplexPair();
			pair.clientSide.end('x');
			assert.strictEqual(pair.serverSide.read(1).toString(), 'x');
		});
		it('writes on server are read by client', function(){
			var pair = u.makeDuplexPair();
			pair.serverSide.end('x');
			assert.strictEqual(pair.clientSide.read(1).toString(), 'x');
		});
		it('close on client is read by server', function(done){
			var pair = u.makeDuplexPair();
			pair.clientSide.end();
			pair.serverSide.resume();
			pair.serverSide.on('end', done);
		});
		it('close on server is read by client', function(done){
			var pair = u.makeDuplexPair();
			pair.serverSide.end();
			pair.clientSide.resume();
			pair.clientSide.on('end', done);
		});
	});
});
