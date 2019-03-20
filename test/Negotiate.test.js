
var http = require('http');
var assert = require('assert');
var writeMessage = require('./util.js').writeMessage;
var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

function testMessage(serverOptions, message){
	var server = http.createServer(lib.handleRequest.bind(null, serverOptions));
	return writeMessage(server, message);
}

describe('Negotiate', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var v1 = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			var v2 = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			route = new lib.Negotiate('http://example.com{/path*}', [
				v1,
				v2,
			]);
		});
		it('Negotiate#name');
		it('Negotiate#prepare');
		it('Negotiate#watch');
		it('Negotiate#listing');
		it('Negotiate#store');
	});

	describe('Multiple variants', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var route = lib.Negotiate('http://example.com{/path*}', [
				lib.RouteStaticFile(docroot, "{/path*}.xhtml", 'application/xhtml+xml', {}),
				lib.RouteStaticFile(docroot, "{/path*}.html", 'text/html', {}),
				lib.RouteStaticFile(docroot, "{/path*}.md", 'text/markdown', {}),
				lib.RouteStaticFile(docroot, "{/path*}.txt", 'text/plain', {}),
			]);
			server.addRoute(route);
		});
		it('no preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				// assert(res.toString().match(/Content-Type: text\/html/));
				// assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.html/));
				// assert(res.toString().match(/Vary: Accept/));
			});
		});
		it('text/html preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/html',
				'Connection: close',
			]).then(function(res){
				// console.log(res.toString());
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: text\/html/));
				// assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.html/));
				// assert(res.toString().match(/Vary: Accept/));
			});
		});
		it('application/xhtml+xml preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: application/xhtml+xml',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: application\/xhtml\+xml/));
				// assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.html/));
				// assert(res.toString().match(/Vary: Accept/));
			});
		});
	});
});
