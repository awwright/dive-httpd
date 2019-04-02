
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
				list: [ {user:'root'}, {user:'guest'} ],
			});
			var v2 = lib.RouteGenerated('http://example.com/~{user}.html', {
				contentType: 'text/html',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
				list: [ {user:'root'}, {user:'guest'} ],
			});
			route = new lib.Negotiate('http://example.com/~{user}', [v1,v2]);
		});
		it('Negotiate#name', function(){
			assert.strictEqual(route.name, 'Negotiate');
		});
		it('Negotiate#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				// I don't actually know if this should be the URI of the negotiating resource or the selected resource
				// assert.equal(res.uri, 'http://example.com/~root');
			});
		});
		it('Negotiate#prepare (404)', function(){
			return route.prepare('http://example.com/~foo').then(function(res){
				assert(!res);
			});
		});
		it('Negotiate#watch', function(done){
			var count = 0;
			route.watch(function(data, filepath){
				count++;
				if(data.user==='guest') return void done();
				// if(count>=2) assert.fail();
			});
		});
		it('Negotiate#listing', function(){
			return route.listing().then(function(list){
				assert.equal(list.length, 2);
				var values = list.map(function(v){ return v.user; }).sort();
				assert.equal(values[0], 'guest');
				assert.equal(values[1], 'root');
			});
		});
		it('Negotiate#store');
	});

	describe('Multiple variants', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var r0 = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.xhtml',
				contentType: 'application/xhtml+xml',
				fileroot: docroot,
				pathTemplate: "{/path*}.xhtml",
			});
			var r1 = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'text/html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			var r2 = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			var r3 = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.txt',
				contentType: 'text/plain',
				fileroot: docroot,
				pathTemplate: "{/path*}.txt",
			});
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
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: text\/html/));
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.html/));
				assert(res.toString().match(/Vary: Accept/));
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
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.xhtml/));
				assert(res.toString().match(/Vary: Accept/));
			});
		});
		it('text/markdown preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/markdown',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: text\/markdown/));
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.md/));
				assert(res.toString().match(/Vary: Accept/));
			});
		});
		it('text/plain (no document)', function(){
			// There's no text/plain variant, so expect something else
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/plain, text/markdown;q=0.50',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: text\/markdown/));
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.md/));
				assert(res.toString().match(/Vary: Accept/));
			});
		});
	});
});
