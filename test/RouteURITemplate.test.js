"use strict";

var assert = require('assert');
var lib = require('../index.js');
var testMessage = require('./util.js').testMessage;
var URIReflect = require('./util.js').URIReflect;

describe('RouteURITemplate', function(){
	describe('interface', function(){
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
		it('RouteURITemplate#listing');
		it('RouteURITemplate#store');
		it('RouteURITemplate#listDependents', function(){
			assert(route.listDependents().length);
		});
		// This route doesn't really need an HTTP interface test,
		// because Application and most of the other tests handle it.
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
			server = new lib.Application;
			data = {
				doc: 'foo\r\n',
			};
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}',
				prepare: function(uri){
					return Promise.resolve();
				},
				error: function(uri, err){
					return Promise.resolve(new lib.StringResource(this, {renderString: function(){
						var res = new lib.MessageHeaders;
						res.setHeader('Content-Type', 'text/plain');
						res.body = `Error: ${err.statusCode}\r\n`;
						return Promise.resolve(res);
					}}));
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/prefix-{name}',
				prepare: function(uri){
					return Promise.resolve();
				},
				error: function(uri, err){
					return Promise.resolve(new lib.StringResource(this, {renderString: function(){
						var res = new lib.MessageHeaders;
						res.setHeader('Content-Type', 'text/plain');
						res.body = `Error special case: ${err.statusCode}\r\n`;
						return Promise.resolve(res);
					}}));
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}.json',
				contentType: 'application/json',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					if(typeof data[match.data['name']] !== 'string') return Promise.resolve();
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = JSON.stringify(data[resource.params['name']]);
					return Promise.resolve(res);
				},
			}));
			server.addRoute(lib.Route({
				uriTemplate: 'http://localhost/{name}.txt',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					if(typeof data[match.data['name']] !== 'string') return Promise.resolve();
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = data[resource.params['name']];
					return Promise.resolve(res);
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
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Error: 404$/m));
			});
		});
		it('404 Not Found - GET </prefix-dne>', function(){
			return testMessage(server, [
				'GET /prefix-dne HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Error special case: 404$/m));
			});
		});
		it('404 Not Found - GET </dne.json>', function(){
			return testMessage(server, [
				'GET /dne.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Error: 404$/m));
			});
		});
		it('404 Not Found - GET </dne.txt>', function(){
			return testMessage(server, [
				'GET /dne.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Error: 404$/m));
			});
		});
		it('200 OK - GET </doc.json>', function(){
			return testMessage(server, [
				'GET /doc.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('200 OK - GET </doc.txt>', function(){
			return testMessage(server, [
				'GET /doc.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('404 Not Found - PUT </doc>', function(){
			// It's questionable if 404 is allowed here
			// 403 Forbidden or 405 Method Not Allowed might be better
			return testMessage(server, [
				'PUT /dne HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Error: 404$/m));
			});
		});
		it('405 Method Not Allowed - PUT </doc.json>', function(){
			return testMessage(server, [
				'PUT /doc.json HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('200 OK - PUT </doc.txt>', function(){
			return testMessage(server, [
				'PUT /doc.txt HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
	});
});
