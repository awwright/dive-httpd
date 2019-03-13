
var http = require('http');
var assert = require('assert');
var writeMessage = require('./util.js').writeMessage;
var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('listen', function(){
	describe('static file', function(){
		it('static file that exists (path form)', function(){
			var server = new lib.HTTPServer;
			server.routes.addTemplate('http://example.com{/path*}.html', {}, lib.RouteStaticFile(docroot, "{/path*}.html", 'application/xhtml+xml', {}));
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('static file that does not exist (path form)', function(){
			var server = new lib.HTTPServer;
			server.routes.addTemplate('http://example.com{/path*}.html', {}, lib.RouteStaticFile(docroot, "{/path*}.html", 'application/xhtml+xml', {}));
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('static file that exists (absolute-form)', function(){
			var server = new lib.HTTPServer;
			server.routes.addTemplate('http://example.com{/path*}.html', {}, lib.RouteStaticFile(docroot, "{/path*}.html", 'application/xhtml+xml', {}));
			return testMessage(server, [
				'GET http://example.com/data-table.html HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('static file that does not exist (absolute-form)', function(){
			var server = new lib.HTTPServer;
			server.routes.addTemplate('http://example.com{/path*}.html', {}, lib.RouteStaticFile(docroot, "{/path*}.html", 'application/xhtml+xml', {}));
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
