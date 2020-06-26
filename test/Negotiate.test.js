"use strict";

var assert = require('assert');

var testMessage = require('./util.js').testMessage;

var lib = require('../index.js');
const { ResponsePassThrough } = require('http-transform');
var docroot = __dirname + '/RouteStaticFile-data';

describe('Negotiate', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var list = ['root', 'guest'];
			var v_base = lib.Route({
				uriTemplate: 'http://example.com/~{user}.json',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					assert(match.uri.indexOf('.json') >= 0);
					assert(match.uri.indexOf('.txt') < 0);
					assert(match.uri.indexOf('.html') < 0);
					assert(match.data.user.indexOf('.json') < 0);
					assert(match.data.user.indexOf('.txt') < 0);
					assert(match.data.user.indexOf('.html') < 0);
					if(match && match.data.user && match.data.user.length>=4){
						return Promise.resolve(new lib.Resource(this, {match}));
					}else{
						return Promise.resolve();
					}
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
				watch: function(cb){
					var self = this;
					function emitUpdate(){
						self.listing().then(function(list){
							list.forEach(function(resource){
								assert(resource.uri.indexOf('.json') >= 0);
								assert(resource.uri.indexOf('.txt') < 0);
								assert(resource.uri.indexOf('.html') < 0);
								assert(resource.params.user.indexOf('.json') < 0);
								assert(resource.params.user.indexOf('.txt') < 0);
								assert(resource.params.user.indexOf('.html') < 0);
								self.watchers.forEach(function(cb){ cb(resource, resource); });
							});
						});
					}
					if(this.watchers){
						this.watchers.push(cb);
					}else{
						this.watchers = [cb];
						process.nextTick(emitUpdate);
					}
				},
				listing: function(){
					var self = this;
					return Promise.all(list.map(function(v){
						return self.prepare(`http://example.com/~${v}.json`);
					}));
				},
			});
			var v_txt = lib.Route({
				uriTemplate: 'http://example.com/~{user}.txt',
				name: 'Route',
				contentType: 'text/plain',
				prepare: function(uri){
					var self = this;
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					assert(match.uri.indexOf('.json') < 0);
					assert(match.uri.indexOf('.txt') >= 0);
					assert(match.uri.indexOf('.html') < 0);
					assert(match.data.user.indexOf('.json') < 0);
					assert(match.data.user.indexOf('.txt') < 0);
					assert(match.data.user.indexOf('.html') < 0);
					return v_base.prepare(match.rewrite(v_base.uriTemplate)).then(function(inner){
						if(!inner) return;
						return new lib.Resource(self, {match, inner});
					});
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
				watch: function(cb){
					var self = this;
					return v_base.watch(function onUpdate(inner, ancestor){
						assert(inner.uri.indexOf('.json') >= 0);
						assert(inner.uri.indexOf('.txt') < 0);
						assert(inner.uri.indexOf('.html') < 0);
						assert(inner.params.user.indexOf('.json') < 0);
						assert(inner.params.user.indexOf('.txt') < 0);
						assert(inner.params.user.indexOf('.html') < 0);
						var match = inner.match.rewrite(self.uriTemplate);
						assert(match.uri.indexOf('.json') < 0);
						assert(match.uri.indexOf('.txt') >= 0);
						assert(match.uri.indexOf('.html') < 0);
						assert(match.data.user.indexOf('.json') < 0);
						assert(match.data.user.indexOf('.txt') < 0);
						assert(match.data.user.indexOf('.html') < 0);
						var rsc = new lib.Resource(self, {match, inner});
						cb(rsc, ancestor);
					});
				},
				listing: function(){
					var self = this;
					return v_base.listing().then(function(list){
						return Promise.resolve(list.map(function(inner){
							assert(inner.uri.indexOf('.json') >= 0);
							assert(inner.uri.indexOf('.txt') < 0);
							assert(inner.uri.indexOf('.html') < 0);
							assert(inner.params.user.indexOf('.json') < 0);
							assert(inner.params.user.indexOf('.txt') < 0);
							assert(inner.params.user.indexOf('.html') < 0);
							var match = inner.match.rewrite(self.uriTemplate);
							assert(match.uri.indexOf('.json') < 0);
							assert(match.uri.indexOf('.txt') >= 0);
							assert(match.uri.indexOf('.html') < 0);
							assert(match.data.user.indexOf('.json') < 0);
							assert(match.data.user.indexOf('.txt') < 0);
							assert(match.data.user.indexOf('.html') < 0);
							return new lib.Resource(self, {match, inner});
						}));
					});
				},
			});
			var v_html = lib.Route({
				uriTemplate: 'http://example.com/~{user}.html',
				name: 'Route',
				contentType: 'text/html',
				prepare: function(uri){
					var self = this;
					var match = this.matchUri(uri);
					if(!match) return Promise.resolve();
					assert(match.uri.indexOf('.json') < 0);
					assert(match.uri.indexOf('.txt') < 0);
					assert(match.uri.indexOf('.html') >= 0);
					assert(match.data.user.indexOf('.json') < 0);
					assert(match.data.user.indexOf('.txt') < 0);
					assert(match.data.user.indexOf('.html') < 0);
					return v_base.prepare(match.rewrite(v_base.uriTemplate)).then(function(inner){
						if(!inner) return;
						return new lib.Resource(self, {match, inner});
					});
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
				watch: function(cb){
					var self = this;
					return v_base.watch(function onUpdate(inner, ancestor){
						assert(inner.uri.indexOf('.json') >= 0);
						assert(inner.uri.indexOf('.txt') < 0);
						assert(inner.uri.indexOf('.html') < 0);
						assert(inner.params.user.indexOf('.json') < 0);
						assert(inner.params.user.indexOf('.txt') < 0);
						assert(inner.params.user.indexOf('.html') < 0);
						var match = inner.match.rewrite(self.uriTemplate);
						assert(match.uri.indexOf('.json') < 0);
						assert(match.uri.indexOf('.txt') < 0);
						assert(match.uri.indexOf('.html') >= 0);
						assert(match.data.user.indexOf('.json') < 0);
						assert(match.data.user.indexOf('.txt') < 0);
						assert(match.data.user.indexOf('.html') < 0);
						var rsc = new lib.Resource(self, {match, inner});
						cb(rsc, ancestor);
					});
				},
				listing: function(){
					var self = this;
					return v_base.listing().then(function(list){
						return Promise.resolve(list.map(function(inner){
							assert(inner.uri.indexOf('.json') >= 0);
							assert(inner.uri.indexOf('.txt') < 0);
							assert(inner.uri.indexOf('.html') < 0);
							assert(inner.params.user.indexOf('.json') < 0);
							assert(inner.params.user.indexOf('.txt') < 0);
							assert(inner.params.user.indexOf('.html') < 0);
							var match = inner.match.rewrite(self.uriTemplate);
							assert(match.uri.indexOf('.json') < 0);
							assert(match.uri.indexOf('.txt') < 0);
							assert(match.uri.indexOf('.html') >= 0);
							assert(match.data.user.indexOf('.json') < 0);
							assert(match.data.user.indexOf('.txt') < 0);
							assert(match.data.user.indexOf('.html') < 0);
							return new lib.Resource(self, {match, inner});
						}));
					});
				},
			});
			route = new lib.Negotiate('http://example.com/~{user}', [v_txt,v_html]);
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
			return route.prepare('http://example.com/~foo').then(function(rsc){
				assert(!rsc);
			});
		});
		it('Negotiate#error');
		it('Negotiate#watch', function(){
			var filePaths = {};
			function handleEvent(resource){
				filePaths[resource.uri] = null;
			}
			return route.watch(handleEvent).then(function(){
				assert.equal(Object.keys(filePaths).length, 2);
			});
		});
		it('Negotiate#listing', function(){
			return route.listing().then(function(list){
				assert.equal(list.length, 2);
				var values = list.map(function(v){ return v.params.user; }).sort();
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
			server = new lib.Application({debug:true});
			var r0 = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.xhtml',
				contentType: 'application/xhtml+xml',
				fileroot: docroot,
				pathTemplate: "{/path*}.xhtml",
			});
			var r1 = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.html',
				contentType: 'text/html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});
			var r2 = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			var r3 = lib.RouteFilesystem({
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
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				// assert.match(res.toString(), /Content-Type: text\/html/);
				// assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.html/);
				// assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('text/html preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/html',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: text\/html/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.html/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('application/xhtml+xml preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: application/xhtml+xml',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: application\/xhtml\+xml/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.xhtml/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('text/markdown preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/markdown',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: text\/markdown/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.md/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('text/plain (no document)', function(){
			// There's no text/plain variant, so expect something else
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/plain, text/markdown;q=0.50',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: text\/markdown/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.md/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
	});
	describe('Multiple variants (pipeline)', function(){
		var server;
		before(function(){
			server = new lib.Application({debug:true});
			var r0 = lib.RouteFilesystem({
				uriTemplate: 'http://example.com{/path*}.md',
				contentType: 'text/markdown',
				fileroot: docroot,
				pathTemplate: "{/path*}.md",
			});
			var r1 = new lib.Route({
				uriTemplate: 'http://example.com{/path*}.json',
				contentType: 'application/json',
				render: function(resource, req){
					const res = new ResponsePassThrough;
					resource.inner.render(req).headersReady.then(function(inner){
						inner.pipe(res);
						res.setHeader('Content-Type', resource.contentType);
						res.flushHeaders(); // Lock the headers
					});
					return res.clientReadableSide;
				},
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
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				// assert.match(res.toString(), /Content-Type: text\/html/);
				// assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document.html/);
				// assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('text/markdown preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/markdown',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: text\/markdown/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document\.md/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('application/json preference', function(){
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: application/json',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: application\/json/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document\.json/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('text/markdown preference with others', function(){
			// There's no text/plain variant, so expect something else
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: application/json;q=0.50, text/markdown',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: text\/markdown/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document\.md/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
		it('application/json preference with others', function(){
			// There's no text/plain variant, so expect something else
			return testMessage(server, [
				'GET http://example.com/document HTTP/1.1',
				'Host: example.com',
				'Accept: text/markdown;q=0.50, application/json',
			]).then(function(res){
				assert.match(res.toString(), /HTTP\/1.1 200 /);
				assert.match(res.toString(), /Content-Type: application\/json/);
				assert.match(res.toString(), /Content-Location: http:\/\/example.com\/document\.json/);
				assert.match(res.toString(), /Vary: Accept/);
			});
		});
	});
});
