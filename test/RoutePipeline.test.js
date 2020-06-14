"use strict";

var assert = require('assert');

var PassThrough = require('http-transform').PassThrough;

var testMessage = require('./util.js').testMessage;
var ToJSONTransform = require('./util.js').ToJSONTransform;
var lib = require('../index.js');

describe('RoutePipeline', function(){
	describe('interface', function(){
		var server, route;
		beforeEach(function(){
			server = new lib.Application({debug:true});
			var list = [ {user:'root'}, {user:'guest'} ];
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.data.user || match.data.user.length < 4){
						return Promise.resolve();
					}
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
				watch: function(cb){
					var self = this;
					var _resolve;
					function emitUpdate(){
						self.listing().then(function(list){
							list.forEach(function(resource){
								self.watchers.forEach(function(cb){ cb(resource, resource); });
							});
						}).then(_resolve);
					}
					if(this.watchers){
						this.watchers.push(cb);
					}else{
						this.watchers = [cb];
						this.watchersReady = new Promise(function(resolve){ _resolve = resolve; });
						process.nextTick(emitUpdate);
					}
					return this.watchersReady;
				},
				listing: function(){
					var self = this;
					return Promise.all(list.map(function(v){
						return self.prepare(`http://example.com/~${v.user}`).then(function(resource){
							if(!resource) throw new Error('Expeced resource!');
							return resource;
						});
					}));
				},
			});
			route = new lib.RoutePipeline({
				uriTemplate: 'http://example.com/~{user}.json',
				contentType: 'application/json',
				outboundTransform: ToJSONTransform,
				innerRoute: gen,
			});
			server.addRoute(route);
		});
		it('RoutePipeline#name', function(){
			assert.strictEqual(route.name, 'Route | ToJSONTransform');
		});
		it('RoutePipeline#label', function(){
			assert.strictEqual(route.label, 'RoutePipeline');
		});
		it('RoutePipeline#prepare (200)', function(){
			return route.prepare('http://example.com/~root.json').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root.json');
				assert.equal(res.contentType, 'application/json');
			});
		});
		it('RoutePipeline#prepare (404)', function(){
			return route.prepare('http://example.com/~foo.json').then(function(res){
				assert(!res);
			});
		});
		it('RoutePipeline#error');
		it('RoutePipeline#watch', function(){
			var filePaths = {};
			function handleEvent(resource){
				filePaths[resource.uri] = null;
			}
			return route.watch(handleEvent).then(function(){
				assert.equal(Object.keys(filePaths).length, 2);
			});
		});
		it('RoutePipeline#listing', function(){
			return route.listing().then(function(list){
				assert.equal(list.length, 2);
				var values = list.map(function(v){ return v.params.user; }).sort();
				assert.equal(values[0], 'guest');
				assert.equal(values[1], 'root');
			});
		});
		it('RoutePipeline#store');
		it('RoutePipeline#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('Pipeline variants', function(){
		it('Baseline', function(){
			var server = new lib.Application({debug:true});
			var route = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
			});
			server.addRoute(route);
			testMessage(server, [
				'GET http://example.com/~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^root$/m);
			});
		});
		it('Base file piped through PassThrough works', function(){
			var server = new lib.Application({debug:true});
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					return Promise.resolve(new lib.Resource(this, {
						match: this.matchUri(uri),
					}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
			});
			var route = new lib.RoutePipeline({
				uriTemplate: 'http://example.com/~{user}.json',
				contentType: 'text/plain',
				outboundTransform: PassThrough,
				innerRoute: gen,
			});
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^root$/m);
			});
		});
		it('Base file piped through ToJSONTransform works', function(){
			var server = new lib.Application({debug:true});
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					return Promise.resolve(new lib.Resource(this, {
						match: this.matchUri(uri),
					}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
			});
			var route = new lib.RoutePipeline({
				uriTemplate: 'http://example.com/~{user}.json',
				contentType: 'application/json',
				outboundTransform: ToJSONTransform,
				innerRoute: gen,
			});
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^"root\\r\\n"$/m);
			});
		});
		it('Two-argument style with PassThrough', function(){
			var server = new lib.Application({debug:true});
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					return Promise.resolve(new lib.Resource(this, {match}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
			});
			var route = lib.RoutePipeline(gen, PassThrough);
			route.uriTemplate = 'http://example.com/~{user}.json';
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^root$/m);
			});
		});
	});
});
