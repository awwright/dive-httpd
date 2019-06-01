
var assert = require('assert');

var testMessage = require('./util.js').testMessage;
var ToJSONTransform = require('./util.js').ToJSONTransform;

var lib = require('../index.js');
var docroot = __dirname + '/RouteStaticFile-data';

describe('Negotiate', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var list = [ {user:'root'}, {user:'guest'} ];
			var v1 = lib.Route({
				uriTemplate: 'http://example.com/~{user}.txt',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.data.user || match.data.user.length < 4){
						return Promise.resolve();
					}
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
				watch: function(cb){
					list.forEach(cb);
				},
				listing: function(cb){
					return Promise.resolve(list);
				},
			});
			var v2 = lib.Route({
				uriTemplate: 'http://example.com/~{user}.html',
				name: 'Route',
				contentType: 'text/html',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.data.user || match.data.user.length < 4){
						return Promise.resolve();
					}
					return Promise.resolve(new lib.StringResource(this, {match}));
				},
				renderString: function(resource){
					var res = new lib.MessageHeaders;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return Promise.resolve(res);
				},
				watch: function(cb){
					list.forEach(cb);
				},
				listing: function(cb){
					return Promise.resolve(list);
				},
			});
			route = new lib.Negotiate('http://example.com/~{user}', [v1,v2]);
		});
		it('Negotiate#name', function(){
			assert.strictEqual(route.name, 'Negotiate(2) [Route , Route]');
		});
		it('Negotiate#label', function(){
			assert.strictEqual(route.label, 'Negotiate(2)');
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
		it('Negotiate#error');
		it('Negotiate#watch', function(){
			var filePaths = {};
			function handleEvent(data, filepath){
				filePaths[data.user] = null;
			}
			return route.watch(handleEvent).then(function(){
				// Adjust this as new files are added
				assert.equal(Object.keys(filePaths).length, 2);
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
		it('Negotiate#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('Multiple variants (files)', function(){
		var server;
		before(function(){
			server = new lib.Application;
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
	describe('Multiple variants (pipeline)', function(){
		var server;
		before(function(){
			server = new lib.Application;
			var r0 = lib.RouteStaticFile({
				uriTemplate: 'http://example.com{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			var r1 = new lib.RoutePipeline({
				uriTemplate: 'http://example.com{/path*}.json',
				contentType: 'application/json',
				outboundTransform: ToJSONTransform,
				innerRoute: r0,
			});
			var route = lib.Negotiate('http://example.com{/path*}', [r0, r1]);
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
		it('application/json preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: application/json',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: application\/json/));
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.json/));
				assert(res.toString().match(/Vary: Accept/));
			});
		});
		it('multiple preference', function(){
			// There's no text/plain variant, so expect something else
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/markdown;q=0.50, application/json',
			]).then(function(res){
				assert(res.toString().match(/HTTP\/1.1 200 /));
				assert(res.toString().match(/Content-Type: application\/json/));
				assert(res.toString().match(/Content-Location: http:\/\/example.com\/document.json/));
				assert(res.toString().match(/Vary: Accept/));
			});
		});
	});
});
