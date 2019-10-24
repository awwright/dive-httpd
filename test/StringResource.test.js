
var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');

describe('StringResource', function(){
	describe('app', function(){
		var app;
		before(function(){
			app = new lib.Application;
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/document',
				prepare: function(){
					return Promise.resolve(new lib.StringResource(this, {}, {ETag: 'etag', lastModified:new Date(1000000000000)}));
				},
				renderString: function(){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', 'text/plain');
					res.body = 'document\r\n';
					return Promise.resolve(res);
				},
			}));
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/crash/throw',
				prepare: function(){
					return Promise.resolve(new lib.StringResource(this));
				},
				renderString: function(){
					throw new Error('Boom');
				},
			}));
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/crash/reject',
				prepare: function(){
					return Promise.resolve(new lib.StringResource(this));
				},
				renderString: function(){
					return new Promise(function(resolve, reject){
						process.nextTick(reject);
					});
				},
			}));
			app.emitError = function(){
				// ignore
			};
		});
		it('Not found', function(){
			return testMessage(app, [
				'GET http://localhost/test-path HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('Error handling (thrown)', function(){
			return testMessage(app, [
				'GET http://localhost/crash/throw HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 500 /));
			});
		});
		it('Error handling (reject)', function(){
			return testMessage(app, [
				'GET http://localhost/crash/reject HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 500 /));
			});
		});
		it('200 OK', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('200 OK (If-Modified-Since)', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
				'If-Modified-Since: Tue, 28 Aug 2001 12:00:00 GMT',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('200 OK (If-Modified-Since +1 day)', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
				'If-Modified-Since: Wed, 29 Aug 2001 12:00:00 GMT',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('200 OK (If-None-Match)', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
				'If-None-Match: "foo"',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('304 Not Modified (If-Modified-Since)', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
				'If-Modified-Since: Sun, 09 Sep 2001 01:46:40 GMT',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 304 /));
			});
		});
		it('304 Not Modified (If-None-Match)', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
				'If-None-Match: "etag"',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 304 /));
			});
		});
	});
});
