
var http = require('http');
var assert = require('assert');

var PassThrough = require('http-transform').PassThrough;

var writeMessage = require('./util.js').writeMessage;
var ToJSONTransform = require('./util.js').ToJSONTransform;
var lib = require('../index.js');

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('RoutePipeline', function(){
	describe('interface', function(){
		var server, route;
		beforeEach(function(){
			server = new lib.HTTPServer;
			var gen = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
				list: ['root'],
			});
			route = new lib.RoutePipeline({
				routerURITemplate: 'http://example.com/~{user}.json',
				contentType: 'application/json',
				outboundTransform: ToJSONTransform,
				innerRoute: gen,
			});
			server.addRoute(route);
		});
		it('RoutePipeline#name', function(){
			assert.strictEqual(route.name, 'Pipeline(RouteGenerated,ToJSONTransform)');
		});
		it('RoutePipeline#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RoutePipeline#prepare (404)', function(){
			return route.prepare('http://example.com/~foo').then(function(res){
				assert(!res);
			});
		});
		it('RoutePipeline#watch', function(done){
			var count = 0;
			return route.watch(function(data, filepath){
				count++;
				if(count===1) return void done();
			});
		});
		it('RoutePipeline#listing');
		it('RoutePipeline#store');
	});
	describe('Pipeline variants', function(){
		it('Baseline', function(){
			var server = new lib.HTTPServer;
			var route = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			server.addRoute(route);
			testMessage(server, [
				'GET http://example.com/~root HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('Base file piped through PassThrough works', function(){
			var server = new lib.HTTPServer;
			var gen = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			var route = new lib.RoutePipeline({
				routerURITemplate: 'http://example.com/~{user}.json',
				contentType: 'text/plain',
				outboundTransform: PassThrough,
				innerRoute: gen,
			});
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('Base file piped through ToJSONTransform works', function(){
			var server = new lib.HTTPServer;
			var gen = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			var route = new lib.RoutePipeline({
				routerURITemplate: 'http://example.com/~{user}.json',
				contentType: 'application/json',
				outboundTransform: ToJSONTransform,
				innerRoute: gen,
			});
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^"root\\r\\n"$/m));
			});
		});
		it('Two-argument style with PassThrough', function(){
			var server = new lib.HTTPServer;
			var gen = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			var route = lib.RoutePipeline(gen, PassThrough);
			route.routerURITemplate = 'http://example.com/~{user}.json';
			server.addRoute(route);
			return testMessage(server, [
				'GET http://example.com/~root.json HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
	});
});
