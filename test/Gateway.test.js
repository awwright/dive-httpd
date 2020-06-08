"use strict";

var http = require('http');
var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');
var TraceResource = require('../lib/Resource.js').TraceResource;

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
		it('Gateway#listing renderString');
		it('Gateway#store');
		it('Gateway#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('app', function(){
		var app, originServer;
		before(function(){
			originServer = http.createServer(function(req, res){
				new TraceResource().render(req).pipe(res);
			}).listen(0);
			var originAddress = originServer.address();

			app = new lib.Application;
			app.addRoute(lib.Gateway({
				uriTemplate: 'http://example.com/{+foo}',
				remoteHost: originAddress.address,
				remotePort: originAddress.port,
			}));
			app.onError = function handleError(req, err){
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
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^GET http:\/\/example\.com\/test-path HTTP\/1\.1$/m));
				assert(res.toString().match(/^Host: example\.com$/im));
			});
		});
		it('HEAD', function(){
			return testMessage(app, [
				'HEAD http://example.com/test-path HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('POST', function(){
			return testMessage(app, [
				'POST http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match('POST http://example.com/test-path HTTP/1.1'));
				assert(res.toString().match(/^Host: example\.com$/im));
				assert(res.toString().match(/^Content-Type: text\/plain$/im));
				assert(res.toString().match(/^Content-Length: 6$/im));
			});
		});
		it('PUT', function(){
			return testMessage(app, [
				'PUT http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^PUT http:\/\/example\.com\/test-path HTTP\/1\.1$/m));
			});
		});
		it('DELETE', function(){
			return testMessage(app, [
				'DELETE http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^DELETE http:\/\/example\.com\/test-path HTTP\/1\.1$/m));
			});
		});
		it('PATCH', function(){
			return testMessage(app, [
				'PATCH http://example.com/test-path HTTP/1.1',
				'Host: example.com',
				'Content-Type: text/plain',
				'Content-Length: 6',
			], "Body\r\n").then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^PATCH http:\/\/example\.com\/test-path HTTP\/1\.1$/m));
			});
		});
	});
});
