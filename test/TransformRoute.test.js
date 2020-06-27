"use strict";

var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');

describe.skip('TransformRoute', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			const inner = new lib.RouteRedirect('http://example.com/~{user}', 'http://www.example.com/~{user}', {statusCode: 300});
			route = new lib.TransformRoute({
				render: function(){

				},
			}, inner);
		});
		it('TransformRoute#label', function(){
			assert.strictEqual(route.label, 'TransformRoute');
		});
		it('TransformRoute#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('TransformRoute#prepare (404)', function(){
			return route.prepare('http://example.com/user/foo').then(function(res){
				assert(!res);
			});
		});
		it('TransformRoute#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('TransformRoute#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('TransformRoute#prepare render', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				assert.equal(buf.statusCode, 300);
			});
		});
		it('TransformRoute#error');
		it('TransformRoute#watch');
		it('TransformRoute#listing');
		it('TransformRoute#store');
		it('TransformRoute#listDependents');
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var route = new lib.TransformRoute('http://example.com/~{user}', 'http://www.example.com/~{user}', {statusCode: 300});
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
