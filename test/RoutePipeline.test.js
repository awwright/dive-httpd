
var assert = require('assert');

var PassThrough = require('http-transform').PassThrough;

var testMessage = require('./util.js').testMessage;
var ToJSONTransform = require('./util.js').ToJSONTransform;
var lib = require('../index.js');

describe('RoutePipeline', function(){
	describe('interface', function(){
		var server, route;
		beforeEach(function(){
			server = new lib.Application;
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
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
				watch: function(cb){
					list.forEach(cb);
				},
				listing: function(cb){
					return Promise.resolve(list);
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
		it('RoutePipeline#watch', function(done){
			var count = 0;
			route.watch(function(data, filepath){
				count++;
				if(data.user==='guest') return void done();
				// if(count>=2) assert.fail();
			});
		});
		it('RoutePipeline#listing', function(){
			return route.listing().then(function(list){
				assert.equal(list.length, 2);
				var values = list.map(function(v){ return v.user; }).sort();
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
			var server = new lib.Application;
			var route = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
			});
			server.addRoute(route);
			testMessage(server, [
				'GET http://example.com/~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('Base file piped through PassThrough works', function(){
			var server = new lib.Application;
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					console.log('prepare', uri.data);
					return Promise.resolve(new lib.StringResource(this, {
						match: this.matchUri(uri),
					}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
			});
			var route = new lib.RoutePipeline({
				uriTemplate: 'http://example.com/~{user}.json',
				contentType: 'text/plain',
				outboundTransform: PassThrough,
				innerRoute: gen,
			});
			server.addRoute(route);
			debugger;
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				console.log('test');
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('Base file piped through ToJSONTransform works', function(){
			var server = new lib.Application;
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					return Promise.resolve(new lib.StringResource(this, {
						match: this.matchUri(uri),
					}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
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
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^"root\\r\\n"$/m));
			});
		});
		it('Two-argument style with PassThrough', function(){
			var server = new lib.Application;
			var gen = lib.Route({
				uriTemplate: 'http://example.com/~{user}',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
			});
			var route = lib.RoutePipeline(gen, PassThrough);
			route.uriTemplate = 'http://example.com/~{user}.json';
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
	});
});
