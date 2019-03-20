
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
		var route;
		beforeEach(function(){
			route = new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.html", 'text/html');
		});
		it('RouteStaticFile#name');
		it('RouteStaticFile#prepare');
		it('RouteStaticFile#watch', function(done){
			var count = 0;
			return route.watch(function(data, filepath){
				count++;
				if(count===1) return void done();
			});
		});
		it('RouteStaticFile#listing', function(){
			return route.listing().then(function(listing){
				// console.log(listing);
				assert(listing.length);
				return Promise.resolve();
			});
		});
		it('RouteStaticFile#store');
	});
	describe('static file', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var route = lib.RouteStaticFile(docroot, "{/path*}.html", 'application/xhtml+xml', {});
			route.routerURITemplate = 'http://example.com{/path*}.html'
			server.addRoute(route);
		});
		it('static file that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
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
				'GET http://example.com/data-table.html HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
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
		it('static file base path jail', function(){
			return testMessage(server, [
				'GET http://example.com/../listen.test.js HTTP/1.1',
				'Host: example.com',
				'Connection: close',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
	});

});
