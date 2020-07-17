"use strict";

var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');

describe('TransformRoute', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			const inner = new lib.Route({
				uriTemplate: 'http://localhost/~{name}',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponsePassThrough;
					res.setHeader('Content-Type', resource.contentType);
					res.end(resource.params.name + '\r\n');
					return res.clientReadableSide;
				},
			});
			route = new lib.TransformRoute({
				render: function(resource, req){
					const input = resource.inner.render(req);
					const output = new lib.ResponsePassThrough();
					input.once('readable', async function(){
						for await(var chunk of input) output.write(chunk.toString().toUpperCase());
						output.end();
					});
					return output.clientReadableSide;
				},
			}, inner);
		});
		it('TransformRoute#label', function(){
			assert.strictEqual(route.label, 'TransformRoute');
		});
		describe('TransformRoute#prepare', function(){
			it('TransformRoute#prepare (200)', function(){
				return route.prepare('http://localhost/~root').then(function(res){
					assert(res instanceof lib.Resource);
					assert.equal(res.uri, 'http://localhost/~root');
				});
			});
			it('TransformRoute#prepare (404)', function(){
				return route.prepare('http://localhost/user/foo').then(function(res){
					assert(!res);
				});
			});
			it('TransformRoute#prepare uri', function(){
				return route.prepare('http://localhost/~root').then(function(res){
					assert.strictEqual(res.uri, 'http://localhost/~root');
				});
			});
			it('TransformRoute#prepare route', function(){
				return route.prepare('http://localhost/~root').then(function(res){
					assert.strictEqual(res.route, route);
				});
			});
			it('TransformRoute#prepare render', function(){
				return route.prepare('http://localhost/~root').then(function(res){
					var stream = res.render();
					assert(stream.pipe);
					return stream.headersReady.then(function(){ return stream; });
				}).then(function(buf){
					assert(buf.statusCode===200 || buf.statusCode===null);
				});
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
			const inner = new lib.Route({
				uriTemplate: 'http://localhost/~{name}',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.name + '\r\n';
					return res.stream();
				},
			});
			const route = new lib.TransformRoute({
				render: function(resource, req){
					const input = resource.inner.render(req);
					const output = new lib.ResponsePassThrough();
					input.once('readable', async function(){
						for await(var chunk of input) output.write(chunk.toString().toUpperCase());
						output.end();
					});
					return output.clientReadableSide;
				},
			}, inner);
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^ROOT$/m);
				assert.doesNotMatch(res.toString(), /^Root$/m);
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
	});
});
