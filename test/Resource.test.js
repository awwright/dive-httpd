"use strict";

var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');

describe('Resource', function(){
	describe('app', function(){
		var app;
		before(function(){
			app = new lib.Application({debug:true});
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/document',
				prepare: function(){
					return Promise.resolve(new lib.Resource(this));
				},
				render: function(){
					var res = new lib.PassThrough;
					res.setHeader('Content-Type', 'text/plain');
					res.end('document\r\n');
					return res;
				},
			}));
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/crash/emit',
				prepare: function(){
					return Promise.resolve(new lib.Resource(this));
				},
				render: function(){
					var res = new lib.PassThrough;
					process.nextTick(function(){
						res.emit('error', new Error('Test'));
					});
					return res;
				},
			}));
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/crash/throw',
				prepare: function(){
					return Promise.resolve(new lib.Resource(this));
				},
				render: function(){
					throw new Error('Boom');
				},
			}));
			app.onError = function(){
				// ignore
			};
		});
		it('Not found', function(){
			return testMessage(app, [
				'GET http://localhost/test-path HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
		it('Error handling (thrown inline)', function(){
			return testMessage(app, [
				'GET http://localhost/crash/throw HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 500 /);
			});
		});
		it('Error handling (emitted)', function(){
			return testMessage(app, [
				'GET http://localhost/crash/emit HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 500 /);
			});
		});
		it('200 OK', function(){
			return testMessage(app, [
				'GET http://localhost/document HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
		it('405 Method Not Allowed', function(){
			// Tests Resource#custom
			return testMessage(app, [
				'PUT http://localhost/document HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 405 /);
			});
		});
	});
});
