"use strict";

var assert = require('assert');
var lib = require('../index.js');
var testMessage = require('./util.js').testMessage;
var URIReflect = require('./util.js').URIReflect;

describe('RouteURITemplate', function(){
	describe('domain', function(){
		it('RouteURITemplate#addRoute expects a Route', function(){
			const route = lib.RouteURITemplate();
			assert.throws(function(){
				route.addRoute(function(){});
			}, /Expected route to be an instanceof Route/);
			assert.strictEqual(route.routes.length, 0);
		});
	});
	describe('RouteURITemplate', function(){
		it('routes', function(){
			const route = lib.RouteURITemplate();
			route.addRoute(new URIReflect('http://localhost/{name}', ['http://localhost/foo']));
			assert.strictEqual(route.routes.length, 1);
		});
	});
	describe('interface (Route)', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
			route.addRoute(new URIReflect('http://localhost/{name}', ['http://localhost/foo']));
		});
		it('RouteURITemplate#label', function(){
			assert.strictEqual(route.label, 'RouteURITemplate(1)');
		});
		it('RouteURITemplate#prepare (found)', function(){
			return route.prepare('http://localhost/foo').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RouteURITemplate#prepare (not found)', function(){
			return route.prepare('http://localhost/bar').then(function(res){
				assert(!res);
			});
		});
		it('RouteURITemplate#error');
		it('RouteURITemplate#watch');
		describe('RouteURITemplate#listing', function(){
			it('RouteURITemplate#listing calls each inner', async function(){
				route.addRoute(new lib.RouteFilesystem({
					uriTemplate: 'http://example.com{/path*}.html',
					fileroot: __dirname+'/RouteStaticFile-data',
					pathTemplate: "{/path*}.html",
					contentType: 'application/xhtml+xml',
				}));
				const list = await route.listing();
				// 3 from RouteFilesystem
				// 1 from URIReflect
				assert.strictEqual(list.length, 4);
			});
			it('RouteURITemplate#listing render');
		});
		it('RouteURITemplate#store');
		it('RouteURITemplate#listDependents', function(){
			assert(route.listDependents().length);
		});
		it('RouteURITemplate#initialize', function(){
			const route_name = route.uriTemplateRouter.routes[0].matchValue;
			var done = false;
			assert(route_name);
			assert(route_name.prepare);
			route_name.initialize = function(){
				return new Promise(function(resolve){
					process.nextTick(function(){
						done = true;
						resolve();
					});
				});
			};
			assert(!done);
			return route.initialize().then(function(){
				assert(done);
			});
		});
		// This route doesn't really need an HTTP interface test,
		// because Application and most of the other tests handle it.
	});
	describe('interface (prepare)', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
			route.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					if(match.params['name'] === 'foo'){
						return Promise.resolve(new lib.Resource(this, {match}));
					}else{
						return Promise.resolve();
					}
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = 'Bar\r\n';
					return res.stream();
				},
			}));
		});
		it('RouteURITemplate#prepare_match (found)', function(){
			return route.prepare('http://localhost/foo').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RouteURITemplate#prepare_match (not found)', function(){
			return route.prepare('http://localhost/bar').then(function(res){
				assert(!res);
			});
		});
	});
	describe('interface (prepare_match)', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
			route.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}',
				contentType: 'text/plain',
				prepare_match: function(match){
					if(match.params['name'] === 'foo'){
						return Promise.resolve(new lib.Resource(this, {match}));
					}else{
						return Promise.resolve();
					}
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = 'Bar\r\n';
					return res.stream();
				},
			}));
		});
		it('RouteURITemplate#prepare_match (found)', function(){
			return route.prepare('http://localhost/foo').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RouteURITemplate#prepare_match (not found)', function(){
			return route.prepare('http://localhost/bar').then(function(res){
				assert(!res);
			});
		});
	});
	describe('interface (empty)', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
		});
		it('RouteURITemplate#label', function(){
			assert.strictEqual(route.label, 'RouteURITemplate(0)');
		});
		it('RouteURITemplate#prepare', function(){
			return route.prepare('http://example.com/foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteURITemplate#error');
		it('RouteURITemplate#watch');
		it('RouteURITemplate#listing');
		it('RouteURITemplate#store');
		it('RouteURITemplate#listDependents', function(){
			assert.equal(route.listDependents().length, 0);
		});
		// This route doesn't really need an HTTP interface test,
		// because Application and most of the other tests handle it.
	});
	describe('app', function(){
		var server, data;
		before(function(){
			server = new lib.Application({debug:true});
			data = {
				doc: 'foo\r\n',
			};
			server.debug = true;
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}',
				prepare: function(uri){
					return Promise.resolve();
				},
				error: function(uri, err){
					return Promise.resolve(new lib.Resource(this, {render: function(){
						var res = new lib.ResponseMessage;
						res.setHeader('Content-Type', 'text/plain');
						res.body = `Error: ${err.statusCode}\r\n`;
						return res.stream();
					}}));
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/prefix-{name}',
				prepare: function(uri){
					return Promise.resolve();
				},
				error: function(uri, err){
					return Promise.resolve(new lib.Resource(this, {render: function(){
						var res = new lib.ResponseMessage;
						res.setHeader('Content-Type', 'text/plain');
						res.body = `Error special case: ${err.statusCode}\r\n`;
						return res.stream();
					}}));
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}.json',
				contentType: 'application/json',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					if(typeof data[match.params['name']] !== 'string') return Promise.resolve();
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = JSON.stringify(data[resource.params['name']]);
					return res.stream();
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}.txt',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					if(typeof data[match.params['name']] !== 'string') return Promise.resolve();
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = data[resource.params['name']];
					return res.stream();
				},
				allocate: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					return Promise.resolve(lib.Resource(this, {match}));
				},
				store: function(){
					
				},
			}));
		});
		it('404 Not Found - GET </dne>', function(){
			// dne: "does not exist"
			return testMessage(server, [
				'GET /dne HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Error: 404$/m);
			});
		});
		it('404 Not Found - GET </prefix-dne>', function(){
			return testMessage(server, [
				'GET /prefix-dne HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Error special case: 404$/m);
			});
		});
		it('404 Not Found - GET </dne.json>', function(){
			return testMessage(server, [
				'GET /dne.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Error: 404$/m);
			});
		});
		it('404 Not Found - GET </dne.txt>', function(){
			return testMessage(server, [
				'GET /dne.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Error: 404$/m);
			});
		});
		it('200 OK - GET </doc.json>', function(){
			return testMessage(server, [
				'GET /doc.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
		it('200 OK - GET </doc.txt>', function(){
			return testMessage(server, [
				'GET /doc.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
		it('404 Not Found - PUT </doc>', function(){
			// It's questionable if 404 is allowed here
			// 403 Forbidden or 405 Method Not Allowed might be better
			return testMessage(server, [
				'PUT /dne HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Error: 404$/m);
			});
		});
		it('405 Method Not Allowed - PUT </doc.json>', function(){
			return testMessage(server, [
				'PUT /doc.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
		it('200 OK - PUT </doc.txt>', function(){
			return testMessage(server, [
				'PUT /doc.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
			});
		});
	});
});
