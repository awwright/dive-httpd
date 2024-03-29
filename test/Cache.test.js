"use strict";

var assert = require('assert');
var { Readable, PassThrough } = require('stream');
const { testMessage, URIReflect } = require('./util.js');

const lib = require('../index.js');
const unit = require('../lib/Cache.js');

describe('Cache', function(){
	describe('unit: parseCacheControl', function(){
		it('public, max-age=31104000, quoted="\\"\\\\123\\\\\\""', function(){
			const val = unit.parseCacheControl('public, max-age=31104000, quoted="\\"\\\\123\\\\\\""');
			assert.strictEqual(val.size, 3);
			assert.strictEqual(val.get('public'), true);
			assert.strictEqual(val.get('max-age'), '31104000');
			// The fully unquoted value is: "\123\"
			// dquote backslash one two three backslash dquoote
			assert.strictEqual(val.get('quoted'), '"\\123\\"');
		});
		it('(empty)', function(){
			const val = unit.parseCacheControl('');
			assert.strictEqual(val.size, 0);
		});
	});
	describe('interface', function(){
		var route;
		before(function(){
			var source = lib.Route({
				name: 'Route',
				uriTemplate: 'http://example.com/~{user}.txt',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.params.user || match.params.user.length < 4){
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
		it('Cache#uriTemplate');
		it('Cache#uriRoute');
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

			const r1 = new lib.TransformRoute({
				innerRoute: new URIReflect('{+any}'),
				render_transform: async function(resource, req, input, output){
					calls++;
					input.pipeHeaders(output);
					output.addHeader('Cache-Control', 'max-age=3600');
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
			assert.match(res0.toString(), /DOCUMENT\.HTML/);
			assert.strictEqual(calls, 1);

			const res1 = await testMessage(app, [
				'GET /document.html HTTP/1.1',
				'Host: localhost',
			]);
			assert.match(res1.toString(), /^HTTP\/1.1 200 /);
			assert.match(res1.toString(), /DOCUMENT\.HTML/);
			assert.strictEqual(calls, 1);
		});
	});
});
