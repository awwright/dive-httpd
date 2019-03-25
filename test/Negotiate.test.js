
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
			var v1 = lib.RouteGenerated('http://example.com/~{user}.txt', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
			});
			var v2 = lib.RouteGenerated('http://example.com/~{user}.html', {
				contentType: 'text/html',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
			});
			route = new lib.Negotiate('http://example.com/~{user}', [v1,v2]);
		});
		it('Negotiate#name', function(){
			assert.strictEqual(route.name, 'Negotiate');
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
		it('Negotiate#watch');
		it('Negotiate#listing');
		it('Negotiate#store');
	});

	describe('Multiple variants', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var r0 = lib.RouteStaticFile(docroot, "{/path*}.xhtml", 'application/xhtml+xml', {});
			r0.routerURITemplate = 'http://example.com{/path*}.xhtml';
			var r1 = lib.RouteStaticFile(docroot, "{/path*}.html", 'text/html', {});
			r1.routerURITemplate = 'http://example.com{/path*}.html';
			var r2 = lib.RouteStaticFile(docroot, "{/path*}.md", 'text/markdown', {});
			r2.routerURITemplate = 'http://example.com{/path*}.html';
			var r3 = lib.RouteStaticFile(docroot, "{/path*}.txt", 'text/plain', {});
			r3.routerURITemplate = 'http://example.com{/path*}.html';
			var route = lib.Negotiate('http://example.com{/path*}', [r0, r1, r2, r3]);
			server.addRoute(route);
		});
		it('no preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
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
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: application\/xhtml\+xml/));
				// assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.html/));
				// assert(res.toString().match(/Vary: Accept/));
			});
		});
	});
});
