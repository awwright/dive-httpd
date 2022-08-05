"use strict";

var http = require('http');
var assert = require('assert');

var testMessage = require('../test/util.js').testMessage;
var lib = require('../index.js');

describe('Gateway', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.Gateway({
				uriTemplate: 'http://localhost/{path}',
			});
		});
		it('Gateway#label', function(){
			assert.strictEqual(route.label, 'Gateway');
		});
		it('Gateway#prepare', function(){
			return route.prepare('http://localhost/foo').then(function(resource){
				assert(resource instanceof lib.Resource);
			});
		});
		it('Gateway#error');
		it('Gateway#watch');
		it('Gateway#listing');
		it('Gateway#store');
		it('Gateway#listDependents', function(){
			assert(route.listDependents().length);
		});
		it('Gateway#uriTemplate');
		it('Gateway#uriRoute');
	});
	describe('app', function(){
		var app, originServer;
		before(function(){
			originServer = http.createServer(function(req, res){
				// Inject a header for whatever
				req.rawHeaders.push('Server');
				req.rawHeaders.push('origin');
				req.headers['server'] = 'origin';
				if(req.url.match(/\/error\/disconnect/)){
					res.socket.destroy();
				}else{
					new lib.TraceResource().render(req).pipeMessage(res);
				}
			}).listen(0);
			var originAddress = originServer.address();

			app = new lib.Application({debug:true});
			app.addRoute(lib.Gateway({
				uriTemplate: 'http://example.com/{+foo}',
				remoteHost: originAddress.address,
				remotePort: originAddress.port,
			}));
			app.onError = function handleError(req, res, err){
				console.error(err);
				throw err;
			};
		});
		after(function(){
			// FIXME use a stream or something
			originServer.close();
		});
		it('GET', function(){
			return testMessage(app, [
				'GET http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Max-Forwards: 2',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^GET http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
				assert.match(res.toString(), /^Host: example\.com$/im);
				assert.match(res.toString(), /^Max-Forwards: 1$/im);
			});
		});
		it('HEAD', function(){
			return testMessage(app, [
				'HEAD http://example.com/test-path HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
		it('TRACE (forward)', function(){
			return testMessage(app, [
				'TRACE http://example.com/test-path HTTP/1.1',
				'Max-Forwards: 3',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^Max-Forwards: 2$/im);
				assert.match(res.toString(), /^Server: origin$/im);
			});
		});
		it('TRACE (no forward)', function(){
			return testMessage(app, [
				'TRACE http://example.com/test-path HTTP/1.1',
				'Max-Forwards: 0',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^Max-Forwards: 0$/im);
				assert.doesNotMatch(res.toString(), /^Server: origin$/im);
			});
		});
		it('POST', function(){
			return testMessage(app, [
				'POST http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^POST http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
				assert.match(res.toString(), /^Host: example\.com$/im);
				assert.match(res.toString(), /^Content-Type: text\/plain$/im);
				assert.match(res.toString(), /^Content-Length: 6$/im);
			});
		});
		it('PUT', function(){
			return testMessage(app, [
				'PUT http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^PUT http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
			});
		});
		it('DELETE', function(){
			return testMessage(app, [
				'DELETE http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^DELETE http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
			});
		});
		it('PATCH', function(){
			return testMessage(app, [
				'PATCH http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^PATCH http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
			});
		});
		it('LOCK', function(){
			return testMessage(app, [
				'LOCK http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^LOCK http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
			});
		});
		it('disconnection causes 502', function(){
			return testMessage(app, [
				'GET /error/disconnect HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 502 /);
			});
		});
	});
	describe('Max-Forwards', function(){
		var app, gatewayServer, originServer;
		before(function(){
			originServer = http.createServer(function(req, res){
				// Inject a header to see if we actually hit the origin or not
				req.rawHeaders.push('Server');
				req.rawHeaders.push('origin');
				req.headers['server'] = 'origin';
				new lib.TraceResource().render(req).pipeMessage(res);
			}).listen(0);
			var originAddress = originServer.address();

			var gatewayApp = new lib.Application({debug:true});
			gatewayApp.addRoute(lib.Gateway({
				uriTemplate: 'http://example.com/{+foo}',
				remoteHost: originAddress.address,
				remotePort: originAddress.port,
			}));
			gatewayApp.onError = function handleError(req, err){ throw err; };
			gatewayServer = http.createServer(new lib.HTTPServer(gatewayApp).callback()).listen(0);
			var gatewayAddress = gatewayServer.address();

			app = new lib.Application({debug:true});
			app.addRoute(lib.Gateway({
				uriTemplate: 'http://example.com/{+foo}',
				remoteHost: gatewayAddress.address,
				remotePort: gatewayAddress.port,
			}));
			app.onError = function handleError(req, err){
				throw err;
			};
		});
		after(function(){
			gatewayServer.close();
			originServer.close();
		});
		it('TRACE Max-Forwards: 2', function(){
			return testMessage(app, [
				'TRACE http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Max-Forwards: 2',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^TRACE http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
				assert.match(res.toString(), /^Host: example\.com$/im);
				assert.match(res.toString(), /^Server: origin$/im);
			});
		});
		it('TRACE Max-Forwards: 1', function(){
			return testMessage(app, [
				'TRACE http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Max-Forwards: 1',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^TRACE http:\/\/example\.com\/test-path HTTP\/1\.1$/m);
				assert.match(res.toString(), /^Host: example\.com$/im);
				assert.doesNotMatch(res.toString(), /^Server: origin$/im);
			});
		});
	});
});
