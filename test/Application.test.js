
var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');

describe('Application', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.Application();
		});
		it('Application#label');
		it('Application#prepare');
		it('Application#error');
		it('Application#watch');
		it('Application#listing');
		it('Application#listing renderString');
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
	});
	describe('Not Found routing', function(){
		var app;
		before(function(){
			const docroot = __dirname + '/RouteStaticFile-data';
			app = new lib.Application;
			app.fixedScheme = 'http';
			app.fixedAuthority = 'localhost';
			app.relaxedHost = true;

			const dir1 = lib.RouteStaticFile({
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

			const dir2 = lib.RouteStaticFile({
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
				assert(res.toString().match(/^HTTP\/1.1 404 /));
			});
		});
		it('/markdown/document.md', function(){
			return testMessage(app, [
				'GET /markdown/document.md HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^Content-Type: text\/markdown$/m));
			});
		});
		it('/html/document.html', function(){
			return testMessage(app, [
				'GET /html/document.html HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^Content-Type: text\/html$/m));
				assert(res.toString().match(/A document/));
			});
		});
		it('/html/does-not-exist.html', function(){
			return testMessage(app, [
				'GET /html/does-not-exist.html HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 404 /));
				assert(res.toString().match(/^Content-Type: text\/html$/m));
				assert(res.toString().match(/Homepage/m));
			});
		});
	});
	describe('TRACE routing', function(){
		var app;
		before(function(){
			const docroot = __dirname + '/RouteStaticFile-data';
			app = new lib.Application;
			app.fixedScheme = 'http';
			app.fixedAuthority = 'localhost';
			app.relaxedHost = true;

			const dir1 = lib.RouteStaticFile({
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

			const dir2 = lib.RouteStaticFile({
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
					assert(res.toString().match(/^HTTP\/1.1 404 /));
				});
			});
			it('TRACE (Max-Forwards: 0)', function(){
				// Choose any URI that doesn't have a definition
				return testMessage(app, [
					'TRACE /some-path-that-does-not-exist HTTP/1.1',
					'Host: localhost',
					'Max-Forwards: 0',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Max-Forwards: 0$/im));
				});
			});
			it('TRACE (to origin)', function(){
				// Choose any URI that doesn't have a definition
				return testMessage(app, [
					'TRACE /some-path-that-does-not-exist HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 404 /));
				});
			});
		});
		describe('/markdown/document.md', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /markdown/document.md HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Content-Type: text\/markdown$/m));
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /markdown/document.md HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Content-Type: message\/http$/m));
					assert(res.toString().match(/^Host: localhost$/m));
				});
			});
		});
		describe('/html/document.html', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /html/document.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Content-Type: text\/html$/m));
					assert(res.toString().match(/A document/));
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /html/document.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Content-Type: message\/http$/m));
					assert(res.toString().match(/^Host: localhost$/m));
				});
			});
		});
		describe('/html/does-not-exist.html', function(){
			it('GET', function(){
				return testMessage(app, [
					'GET /html/does-not-exist.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 404 /));
					assert(res.toString().match(/^Content-Type: text\/html$/m));
					assert(res.toString().match(/Homepage/m));
				});
			});
			it('TRACE (to origin)', function(){
				return testMessage(app, [
					'TRACE /html/does-not-exist.html HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert(res.toString().match(/^HTTP\/1.1 200 /));
					assert(res.toString().match(/^Content-Type: message\/http$/m));
					assert(res.toString().match(/^Host: localhost$/m));
				});
			});
		});
	});
});
