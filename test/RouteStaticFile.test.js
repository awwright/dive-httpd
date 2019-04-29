
var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

describe('RouteStaticFile', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'text/html',
				fileroot: __dirname+'/RouteStaticFile-data',
				pathTemplate: "{/path*}.html",
			});
		});
		it('RouteStaticFile#name', function(){
			assert.strictEqual(route.name.substring(0,16), 'RouteStaticFile(');
		});
		it('RouteStaticFile#label', function(){
			assert.strictEqual(route.label.substring(0,16), 'RouteStaticFile(');
		});
		it('RouteStaticFile#prepare (200)', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/data-table.html');
				assert.equal(res.contentType, 'text/html');
			});
		});
		it('RouteStaticFile#prepare (no file)', function(){
			return route.prepare('http://example.com/dne.html').then(function(res){
				assert(!res);
			});
		});
		it('RouteStaticFile#prepare (no route)', function(){
			return route.prepare('http://example.com/dne.txt').then(function(res){
				assert(!res);
			});
		});
		it('RouteStaticFile#prepare uri', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/data-table.html');
			});
		});
		it('RouteStaticFile#prepare params', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.params.path[0], 'data-table');
				assert.strictEqual(res.params.path.length, 1);
			});
		});
		it('RouteStaticFile#prepare route', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteStaticFile#prepare renderStream', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
			});
		});
		it('RouteStaticFile#prepare renderBytes', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				return res.renderBytes();
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
				assert.equal(buf.body.length, 565);
			});
		});
		it('RouteStaticFile#prepare renderString', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				return res.renderString();
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
				assert.equal(buf.body.length, 563);
			});
		});
		it('RouteStaticFile#error');
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
		it('RouteStaticFile#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('static file', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var route = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
				contentType: 'application/xhtml+xml',
			});
			server.addRoute(route);
		});
		it('static file that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('static file that does not exist (origin-form)', function(){
			return testMessage(server, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('static file that exists (absolute-form)', function(){
			return testMessage(server, [
				'GET http://example.com/data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
			});
		});
		it('static file that does not exist (absolute-form)', function(){
			return testMessage(server, [
				'GET http://example.com/some-path-that-does-not-exist HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('static file base path jail', function(){
			return testMessage(server, [
				'GET http://example.com/../listen.test.js HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
	});

	describe('static file (with link to file: URI)', function(){
		var server;
		before(function(){
			server = new lib.HTTPServer;
			var route = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'application/xhtml+xml',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
				filepathLink: true,
				filepathAuthority: 'localhost',
				filepathRel: 'tag:awwright.github.io,2019:dive-httpd/source',
			});
			server.addRoute(route);
		});
		it('static file that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^Link: <file:\/\/[^>]+\/data-table.html>;rel="tag:awwright\.github\.io,2019:dive-httpd\/source"/m));
			});
		});
	});

});
