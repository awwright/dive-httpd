"use strict";

var assert = require('assert');
var { Readable, PassThrough } = require('stream');
const { testMessage } = require('./util.js');

const lib = require('../index.js');
const unit = require('../lib/Cache.js');

describe('Cache', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var source = lib.Route({
				name: 'Route',
				uriTemplate: 'http://example.com/~{user}.txt',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.data.user || match.data.user.length < 4){
						return Promise.resolve();
					}
					return Promise.resolve(new lib.Resource(this, {
						match: match,
					}));
				},
				render: function(resource){
					var res = new lib.ResponseMessage;
					res.setHeader('Content-Type', resource.contentType);
					res.body = resource.params.user + "\r\n";
					return res.stream();
				},
			});
			route = new lib.Cache('http://example.com/~{user}', source);
		});
		it('Cache#name', function(){
			assert.strictEqual(route.name, 'Route | Cache');
		});
		it('Cache#label', function(){
			assert.strictEqual(route.label, 'Cache');
		});
		describe('Cache#prepare', function(){
			it('Cache#prepare (200)');
			it('Cache#prepare (404)');
		});
		it('Cache#error');
		it('Cache#watch');
		it('Cache#listing');
		it('Cache#store');
		it('Cache#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('app', function(){
		var app, cache, calls=0;
		const cachepath = __dirname + '/.cache.tmp';
		before(async function(){
			const docroot = __dirname + '/RouteStaticFile-data';

			app = new lib.Application({debug:true});
			app.fixedScheme = 'http';
			app.fixedAuthority = 'localhost';
			app.relaxedHost = true;

			const r0 = new lib.RouteFilesystem({
				uriTemplate: 'http://localhost{/path*}.html',
				contentType: 'text/html',
				fileroot: docroot,
				pathTemplate: "{/path*}.html",
			});

			const r1 = new lib.TransformRoute({
				innerRoute: r0,
				render_transform: async function(resource, req, input, output){
					calls++;
					input.pipeHeaders(output);
					for await(var chunk of input){
						output.write(chunk.toString().toUpperCase());
					}
					output.end();
				},
			});

			cache = new lib.Cache({
				cacheFilepath: cachepath,
			}, r1);
			app.addRoute(cache);

			// Clear out files
			await cache.storageClear();
		});
		after(async function(){
			await cache.storageClear();
		});
		it('First response is fresh, second comes from cache', async function(){
			assert.strictEqual(calls, 0);

			const res0 = await testMessage(app, [
				'GET /document.html HTTP/1.1',
				'Host: localhost',
			]);
			assert.match(res0.toString(), /^HTTP\/1.1 200 /);
			assert.match(res0.toString(), /A DOCUMENT/);
			assert.strictEqual(calls, 1);

			const res1 = await testMessage(app, [
				'GET /document.html HTTP/1.1',
				'Host: localhost',
			]);
			assert.match(res1.toString(), /^HTTP\/1.1 200 /);
			assert.match(res1.toString(), /A DOCUMENT/);
			assert.strictEqual(calls, 1);
		});
	});
});
