
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
					return Promise.resolve(new lib.StringResource(this));
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
	});
});
