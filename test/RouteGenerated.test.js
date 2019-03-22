
var http = require('http');
var assert = require('assert');
var writeMessage = require('./util.js').writeMessage;
var lib = require('../index.js');

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('RouteGenerated', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
				list: ['root', 'guest'],
			});
		});
		it('RouteGenerated#name', function(){
			assert.strictEqual(route.name, 'RouteGenerated');
		});
		it('RouteGenerated#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RouteGenerated#prepare (404)', function(){
			return route.prepare('http://example.com/~foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteGenerated#watch', function(done){
			var count = 0;
			return route.watch(function(data, filepath){
				count++;
				if(count===1) return void done();
			});
		});
		it('RouteGenerated#listing', function(){
			return route.listing().then(function(list){
				assert(list.length);
			});
		});
		it('RouteGenerated#store');
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.HTTPServer;
			var route = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('static file that exists (absolute-form)', function(){
			return testMessage(server, [
				'GET http://example.com/~root HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
			});
		});
		it('static file that does not exist (absolute-form)', function(){
			return testMessage(server, [
				'GET http://example.com/some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
	});
});
