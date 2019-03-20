
var http = require('http');
var assert = require('assert');

var PassThrough = require('http-transform').PassThrough;

var writeMessage = require('./util.js').writeMessage;
var lib = require('../index.js');

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('Pipeline', function(){
	describe('Pipeline variants', function(){
		it('Base file works', function(){
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
			var route = lib.RoutePipeline(gen, PassThrough);
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
		it('Base file piped through FooterTransform works');
	});
});
