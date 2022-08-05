"use strict";

var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');

describe('RouteRedirect', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RouteRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}', {statusCode: 300});
		});
		it('RouteRedirect#label', function(){
			assert.strictEqual(route.label, 'RouteRedirect');
		});
		it('RouteRedirect#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteRedirect#prepare (404)', function(){
			return route.prepare('http://example.com/user/foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteRedirect#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteRedirect#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteRedirect#prepare render', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				assert.equal(buf.statusCode, 300);
			});
		});
		it('RouteRedirect#error');
		it('RouteRedirect#watch');
		it('RouteRedirect#listing');
		it('RouteRedirect#store');
		it('RouteRedirect#listDependents');
		it('RouteRedirect#uriTemplate', function(){
			assert.strictEqual(route.uriTemplate, 'http://example.com/~{user}');
		});
		it('RouteRedirect#uriRoute', function(){
			assert.strictEqual(route.uriRoute.uriTemplate, route.uriTemplate);
		});
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var route = new lib.RouteRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}', {statusCode: 300});
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 300 /);
				assert.match(res.toString(), /^Location: http:\/\/www\.example\.com\/~root$/m);
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
	});
});

describe('RouteSeeOther', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RouteSeeOther('http://example.com/~{user}', 'http://www.example.com/~{user}');
		});
		it('RouteSeeOther#label', function(){
			assert.strictEqual(route.label, 'RouteSeeOther');
		});
		it('RouteSeeOther#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteSeeOther#prepare (404)', function(){
			return route.prepare('http://example.com/user/foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteSeeOther#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteSeeOther#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteSeeOther#prepare render', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				assert.equal(buf.statusCode, 303);
			});
		});
		it('RouteSeeOther#error');
		it('RouteSeeOther#watch');
		it('RouteSeeOther#listing');
		it('RouteSeeOther#store');
		it('RouteSeeOther#listDependents');
		it('RouteSeeOther#uriTemplate', function(){
			assert.strictEqual(route.uriTemplate, 'http://example.com/~{user}');
		});
		it('RouteSeeOther#uriRoute', function(){
			assert.strictEqual(route.uriRoute.uriTemplate, route.uriTemplate);
		});
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var route = new lib.RouteSeeOther('http://example.com/~{user}', 'http://www.example.com/~{user}');
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 303 /);
				assert.match(res.toString(), /^Location: http:\/\/www\.example\.com\/~root$/m);
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
	});
});

describe('RouteTemporaryRedirect', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RouteTemporaryRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}');
		});
		it('RouteTemporaryRedirect#label', function(){
			assert.strictEqual(route.label, 'RouteTemporaryRedirect');
		});
		it('RouteTemporaryRedirect#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteTemporaryRedirect#prepare (404)', function(){
			return route.prepare('http://example.com/user/foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteTemporaryRedirect#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteTemporaryRedirect#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteTemporaryRedirect#prepare render', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				assert.equal(buf.statusCode, 307);
			});
		});
		it('RouteTemporaryRedirect#error');
		it('RouteTemporaryRedirect#watch');
		it('RouteTemporaryRedirect#listing');
		it('RouteTemporaryRedirect#store');
		it('RouteTemporaryRedirect#listDependents');
		it('RouteTemporaryRedirect#uriTemplate', function(){
			assert.strictEqual(route.uriTemplate, 'http://example.com/~{user}');
		});
		it('RouteTemporaryRedirect#uriRoute', function(){
			assert.strictEqual(route.uriRoute.uriTemplate, route.uriTemplate);
		});
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var route = new lib.RouteTemporaryRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}');
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 307 /);
				assert.match(res.toString(), /^Location: http:\/\/www\.example\.com\/~root$/m);
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
	});
});

describe('RoutePermanentRedirect', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RoutePermanentRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}');
		});
		it('RoutePermanentRedirect#label', function(){
			assert.strictEqual(route.label, 'RoutePermanentRedirect');
		});
		it('RoutePermanentRedirect#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('RoutePermanentRedirect#prepare (404)', function(){
			return route.prepare('http://example.com/user/foo').then(function(res){
				assert(!res);
			});
		});
		it('RoutePermanentRedirect#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('RoutePermanentRedirect#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RoutePermanentRedirect#prepare render', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				assert.equal(buf.statusCode, 308);
			});
		});
		it('RoutePermanentRedirect#error');
		it('RoutePermanentRedirect#watch');
		it('RoutePermanentRedirect#listing');
		it('RoutePermanentRedirect#store');
		it('RoutePermanentRedirect#listDependents');
		it('RoutePermanentRedirect#uriTemplate', function(){
			assert.strictEqual(route.uriTemplate, 'http://example.com/~{user}');
		});
		it('RoutePermanentRedirect#uriRoute', function(){
			assert.strictEqual(route.uriRoute.uriTemplate, route.uriTemplate);
		});
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var route = new lib.RoutePermanentRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}');
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 308 /);
				assert.match(res.toString(), /^Location: http:\/\/www\.example\.com\/~root$/m);
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
	});
});
