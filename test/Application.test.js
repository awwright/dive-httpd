"use strict";

var assert = require('assert');

var testMessage = require('../test/util.js').testMessage;
var lib = require('../index.js');

describe('Application', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.Application();
		});
		after(function(){
			route = null;
		});
		it('Application#label');
		describe('Application#prepare', function(){
			it('argument req.uri is required', function(){
				const req = {uri:null, headers: {}};
				const res = new lib.ResponsePassThrough;
				assert.throws(function(){
					route.handleRequest(req, res.serverWritableSide);
				}, /req\.uri/);
			});
			it('argument req.headers is required', function(){
				const req = {uri: 'http://example.com/', headers:null};
				const res = new lib.ResponsePassThrough;
				assert.throws(function(){
					route.handleRequest(req, res.serverWritableSide);
				}, /req\.headers/);
			});
		});
		it('Application#error');
		it('Application#watch');
		it('Application#listing');
		it('Application#store');
		it('Application#listDependents', function(){
			assert(route.listDependents().length);
		});
		it('Application#before', function(){
			var flag = false;
			route.before(function(){
				flag = true;
			});
			assert.equal(flag, false);
			return route.initialize().then(function(){
				assert.equal(flag, true);
			});
		});
		// If enabled, print full 500 errors to response
		// A useful feature for automated testing and development
		it('Application#debug');
		it('Application#initialize');
		it('Application#uriTemplate');
		it('Application#uriRoute');
	});
	describe('defaultNotFound', function(){
		it('defaultNotFound');
	});
	describe('Not Found routing', function(){
		var app;
		before(function(){
			const docroot = __dirname + '/RouteStaticFile-data';
			app = new lib.Application({debug:true});
			app.fixedScheme = 'http';
			app.fixedAuthority = 'localhost';
			app.relaxedHost = true;

			const dir1 = lib.RouteFilesystem({
				uriTemplate: 'http://localhost/html{/path*}.html',
				contentType: 'text/html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			dir1.error = function(match, err){
				var prepare = dir1.prepare('http://localhost/html/data-table.html');
				return prepare;
			};
			app.addRoute(dir1);

			const dir2 = lib.RouteFilesystem({
				uriTemplate: 'http://localhost/markdown{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			app.addRoute(dir2);
		});
		after(function(){
			app = undefined;
		});
		it('404 Not Found', function(){
			// Choose any URI that doesn't have a definition
			return testMessage(app, [
				'GET /some-path-that-does-not-exist HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
			});
		});
		it('/markdown/document.md', function(){
			return testMessage(app, [
				'GET /markdown/document.md HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^Content-Type: text\/markdown$/m);
			});
		});
		it('/html/document.html', function(){
			return testMessage(app, [
				'GET /html/document.html HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 200 /);
				assert.match(res.toString(), /^Content-Type: text\/html$/m);
				assert.match(res.toString(), /A document/);
			});
		});
		it('/html/does-not-exist.html', function(){
			return testMessage(app, [
				'GET /html/does-not-exist.html HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert.match(res.toString(), /^HTTP\/1.1 404 /);
				assert.match(res.toString(), /^Content-Type: text\/html$/m);
				assert.match(res.toString(), /Homepage/m);
			});
		});
	});
	describe('TRACE routing', function(){
		var app;
		before(function(){
			const docroot = __dirname + '/RouteStaticFile-data';
			app = new lib.Application({debug:true});
			app.fixedScheme = 'http';
			app.fixedAuthority = 'localhost';
			app.relaxedHost = true;

			const dir1 = lib.RouteFilesystem({
				uriTemplate: 'http://localhost/html{/path*}.html',
				contentType: 'text/html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			dir1.error = function(match, err){
				var prepare = dir1.prepare('http://localhost/html/data-table.html');
				return prepare;
			};
			app.addRoute(dir1);

			const dir2 = lib.RouteFilesystem({
				uriTemplate: 'http://localhost/markdown{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			app.addRoute(dir2);
		});
		after(function(){
			app = undefined;
		});
		describe('404 Not Found (default case)', function(){
			it('HEAD', function(){
				// Choose any URI that doesn't have a definition
				return testMessage(app, [
					'GET /some-path-that-does-not-exist HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 404 /);
				});
			});
			it('TRACE (Max-Forwards: 0)', function(){
				// Choose any URI that doesn't have a definition
				return testMessage(app, [
					'TRACE /some-path-that-does-not-exist HTTP/1.1',
					'Host: localhost',
					'Max-Forwards: 0',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Max-Forwards: 0$/im);
				});
			});
			it('TRACE (to origin)', function(){
				// Choose any URI that doesn't have a definition
				return testMessage(app, [
					'TRACE /some-path-that-does-not-exist HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 501 /);
				});
			});
		});
		describe('/markdown/document.md', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /markdown/document.md HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Content-Type: text\/markdown$/m);
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /markdown/document.md HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Content-Type: message\/http$/m);
					assert.match(res.toString(), /^Host: localhost$/m);
				});
			});
		});
		describe('/html/document.html', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /html/document.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Content-Type: text\/html$/m);
					assert.match(res.toString(), /A document/);
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /html/document.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Content-Type: message\/http$/m);
					assert.match(res.toString(), /^Host: localhost$/m);
				});
			});
		});
		describe('/html/does-not-exist.html', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /html/does-not-exist.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 404 /);
					assert.match(res.toString(), /^Content-Type: text\/html$/m);
					assert.match(res.toString(), /Homepage/m);
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /html/does-not-exist.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^Content-Type: message\/http$/m);
					assert.match(res.toString(), /^Host: localhost$/m);
				});
			});
		});
	});
});
