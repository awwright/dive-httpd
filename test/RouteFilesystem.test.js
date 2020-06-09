"use strict";

var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

describe('RouteFilesystem', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = new lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'text/html',
				fileroot: __dirname+'/RouteStaticFile-data',
				pathTemplate: "{/path*}.html",
			});
		});
		it('RouteFilesystem#name', function(){
			assert.strictEqual(route.name.substring(0,16), 'RouteFilesystem(');
		});
		it('RouteFilesystem#label', function(){
			assert.strictEqual(route.label.substring(0,16), 'RouteFilesystem(');
		});
		it('RouteFilesystem#prepare (200)', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/data-table.html');
				assert.equal(res.contentType, 'text/html');
			});
		});
		it('RouteFilesystem#prepare (no file)', function(){
			return route.prepare('http://example.com/dne.html').then(function(res){
				assert(!res);
			});
		});
		it('RouteFilesystem#prepare (no route)', function(){
			return route.prepare('http://example.com/dne.txt').then(function(res){
				assert(!res);
			});
		});
		it('RouteFilesystem#prepare uri', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/data-table.html');
			});
		});
		it('RouteFilesystem#prepare params', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.params.path[0], 'data-table');
				assert.strictEqual(res.params.path.length, 1);
			});
		});
		it('RouteFilesystem#prepare route', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteFilesystem#error');
		it('RouteFilesystem#watch', function(){
			var count = 0;
			var filePaths = {};
			function handleEvent(resource){
				count++;
				filePaths[resource.uri] = null;
			}
			return route.watch(handleEvent).then(function(){
				// Adjust this as new files are added
				assert.equal(count, 3);
				assert.equal(Object.keys(filePaths).length, 3);
			});
		});
		it('RouteFilesystem#listing', function(){
			var filePaths = {};
			return route.listing().then(function(listing){
				listing.forEach(function(resource){
					filePaths[resource.uri] = null;
				});
				assert.equal(Object.keys(filePaths).length, 3);
			});
		});
		it('RouteFilesystem#listing render', function(){
			var filePaths = {};
			return route.listing().then(function(listing){
				return Promise.all(listing.map(function(resource){
					return lib.ResponseMessage.fromStream(resource.render()).then(function(res){
						// assert.equal(res.statusCode, 200);
						assert(res.body.length > 0);
						filePaths[resource.uri] = null;
					});
				}));
			}).then(function(result){
				assert.equal(Object.keys(filePaths).length, 3);
			});
		});
		it('RouteFilesystem#store');
		it('RouteFilesystem#listDependents', function(){
			assert(route.listDependents().length);
		});
		it('RouteFilesystem#onReady', function(){
			return route.onReady;
		});
	});
	describe('static file', function(){
		var server;
		before(function(){
			server = new lib.Application;
			var route = lib.RouteFilesystem({
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
			server = new lib.Application;
			var route = lib.RouteFilesystem({
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

	describe('If-Modified-Since', function(){
		var server;
		before(function(){
			server = new lib.Application;
			var route = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'application/xhtml+xml',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			server.addRoute(route);
		});
		it('initial request', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^Last-Modified:\s+(.*)$/im));
			});
		});
		it('initial request then freshen request', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				var m = res.toString().match(/^Last-Modified:\s+(.*)$/im);
				assert(m);
				return testMessage(server, [
					'GET /data-table.html HTTP/1.1',
					'Host: example.com',
					'If-Modified-Since: '+m[1],
				]);
			}).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 304 /));
				assert(!res.toString().match(/^Content-Type:/im));
			});
		});
	});

	describe('If-None-Match', function(){
		var server;
		before(function(){
			server = new lib.Application;
			var route = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'application/xhtml+xml',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			server.addRoute(route);
		});
		it('initial request', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^ETag:\s+(.*)$/im));
			});
		});
		it('initial request then freshen request', function(){
			return testMessage(server, [
				'GET /data-table.html HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				var m = res.toString().match(/^ETag:\s+(".*")$/im);
				assert(m);
				return testMessage(server, [
					'GET /data-table.html HTTP/1.1',
					'Host: example.com',
					'If-None-Match: '+m[1],
				]);
			}).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 304 /));
				assert(!res.toString().match(/^Content-Type:/im));
			});
		});
	});

});
