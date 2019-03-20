
var http = require('http');
var assert = require('assert');
var writeMessage = require('./util.js').writeMessage;
var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('RouteStaticFile', function(){
	describe('interface', function(){
		it('#listing');
		it('#watch');
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
				console.log(res.toString());
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/root/));
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
				console.log(res.toString());
				assert(res.toString().match(/^HTTP\/1.1 200 /));
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
