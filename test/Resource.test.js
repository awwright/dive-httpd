"use strict";

var assert = require('assert');

var testMessage = require('../test/util.js').testMessage;
var lib = require('../index.js');

describe('Resource', function(){
	describe('interface', function(){
		describe('Resource#render', function(){
			it('Default function calls route.render', function(){
				const inner = new lib.Route({
					uriTemplate: 'http://localhost/~{name}',
					contentType: 'text/plain',
					prepareMatch: async function(match){
						return new lib.Resource(this, {match});
					},
					render: function(resource){
						const out = new lib.ResponsePassThrough();
						out.setHeader('Content-Type', 'text/plain');
						out.end(resource.params.name+'\r\n');
						return out.clientReadableSide;
					},
				});
				return inner.prepare('http://localhost/~root').then(async function(resource){
					const res = resource.render();
					var out = '';
					for await(const chunk of res) out += chunk;
					assert.strictEqual(out, 'root\r\n');
					assert.strictEqual(res.headers['content-type'], 'text/plain');
				});
			});
			it('Default function throws if Route#render() does not return a stream', function(){
				const inner = new lib.Route({
					uriTemplate: 'http://localhost/~{name}',
					contentType: 'text/plain',
					prepare: function(uri){
						var match = this.matchUri(uri);
						if(!match) return Promise.resolve();
						return Promise.resolve(new lib.Resource(this, {match}));
					},
					render: function(resource){
						return function(){};
					},
				});
				return assert.rejects(inner.prepare('http://localhost/~root').then(function(resource){
					resource.render();
				}), /did not return a Response/);
			});
		});
		describe('Resource#error', function(){
			var route;
			beforeEach(function(){
				route = new lib.Route({
					uriTemplate: 'http://localhost/document',
					methods: ['GET', 'HEAD', 'OPTIONS'],
					prepare: function(){
						return Promise.resolve(new lib.Resource(this));
					},
					render: function(){
						var res = new lib.ResponsePassThrough;
						res.setHeader('Content-Type', 'text/plain');
						res.end('The document\r\n');
						return res;
					},
					error: async function(uri, err){
						return new lib.Resource(this, {
							render() {
								var res = new lib.ResponsePassThrough;
								if(err.statusCode) res.statusCode = err.statusCode;
								res.setHeader('Content-Type', 'text/plain');
								res.end('statusCode='+err.statusCode+'\r\n'+err+'\r\n');
								return res.clientReadableSide;
							},
						});
					},
				});
			});
			it('Resource#error(400)', async function(){
				const resource = await route.error('http://localhost/document', new lib.errors.ClientError('Generic error'));
				assert(resource);
				const res = await lib.ResponseMessage.fromStream(resource.render());
				assert(res);
				assert.strictEqual(res.statusCode, 400);
				assert.match(res.body, /statusCode=400/);
				assert.match(res.body, /Generic error/);
			});
			it('Resource#handle(POST) sends 405', async function(){
				const resource = await route.prepare('http://localhost/document');
				assert(resource);
				const res = await lib.ResponseMessage.fromStream(resource.handle({
					uri: 'http://localhost/document',
					method: 'POST',
					headers: {},
				}));
				assert(res);
				assert.strictEqual(res.statusCode, 405);
				assert.match(res.body, /statusCode=405/);
			});
		});
	});
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
						res.emit('error', new Error('Boom 0'));
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
					throw new Error('Boom 1');
				},
			}));
			app.addRoute(new lib.Route({
				uriTemplate: 'http://localhost/error/405',
				methods: ['GET', 'HEAD', 'OPTIONS'],
				prepare: function(){
					return Promise.resolve(new lib.Resource(this));
				},
				render: function(){
					var res = new lib.ResponsePassThrough;
					res.setHeader('Content-Type', 'text/plain');
					res.end('The document\r\n');
					return res;
				},
				error: async function(uri, err){
					return new lib.Resource(this, {
						render() {
							var res = new lib.ResponsePassThrough;
							if(err.statusCode) res.statusCode = err.statusCode;
							res.setHeader('Content-Type', 'text/plain');
							res.end('statusCode='+err.statusCode+'\r\n'+err+'\r\n');
							return res.clientReadableSide;
						},
					});
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
				assert.match(res.toString(), /Boom 1/);
			});
		});
		it('Error handling (emitted)', function(){
			return testMessage(app, [
				'GET http://localhost/crash/emit HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 500 /);
				assert.match(res.toString(), /Boom 0/);
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
		describe('Custom 405', function(){
			it('Positive', function(){
				// Tests Resource#custom
				return testMessage(app, [
					'GET http://localhost/error/405 HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^The document$/m);
				});
			});
			it('Negative', function(){
				// Tests Resource#custom
				return testMessage(app, [
					'POST http://localhost/error/405 HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 405 /);
					assert.match(res.toString(), /^statusCode=405$/m);
				});
			});
			it('None', function(){
				// Tests Resource#custom
				return testMessage(app, [
					'POST http://localhost/document HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 405 /);
					assert.match(res.toString(), /does not implement the POST method/m);
				});
			});
		});
	});
});
