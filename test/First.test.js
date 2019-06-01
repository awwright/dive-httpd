
var assert = require('assert');
var lib = require('../index.js');

describe('First', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.First([
				new lib.RouteStaticFile({
					uriTemplate: 'http://example.com{/path*}.html',
					contentType: 'text/html',
					fileroot: __dirname+'/RouteStaticFile-data',
					pathTemplate: "{/path*}.html",
				}),
				new lib.RouteStaticFile({
					uriTemplate: 'http://example.com{/path*}.xhtml',
					contentType: 'application/xhtml+xml',
					fileroot: __dirname+'/RouteStaticFile-data',
					pathTemplate: "{/path*}.xhtml",
				}),
				new lib.RouteStaticFile({
					uriTemplate: 'http://example.com{/path*}.txt',
					contentType: 'text/plain',
					fileroot: __dirname+'/RouteStaticFile-data',
					pathTemplate: "{/path*}.txt",
				}),
			]);
		});
		it('First#name', function(){
			assert.strictEqual(route.name.substring(0,5), 'First');
		});
		it('First#label', function(){
			assert.strictEqual(route.label, 'First(3)');
		});
		it('First#prepare (200, data-table.html)', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/data-table.html');
				assert.equal(res.contentType, 'text/html');
			});
		});
		it('First#prepare (200, document.xhtml)', function(){
			return route.prepare('http://example.com/document.xhtml').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/document.xhtml');
				assert.equal(res.contentType, 'application/xhtml+xml');
			});
		});
		it('First#prepare (404)', function(){
			return route.prepare('http://example.com/data-table.txt').then(function(res){
				assert(!res);
			});
		});
		it('First#prepare uri', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/data-table.html');
			});
		});
		it('First#prepare params', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				assert.strictEqual(res.params.path[0], 'data-table');
				assert.strictEqual(res.params.path.length, 1);
			});
		});
		it.skip('First#prepare route', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				// TODO determine a value for this
				// assert.strictEqual(res.route, route);
			});
		});
		it('First#prepare renderStream', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
			});
		});
		it('First#prepare renderBytes', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				return res.renderBytes();
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
				assert.equal(buf.body.length, 565);
			});
		});
		it('First#prepare renderString', function(){
			return route.prepare('http://example.com/data-table.html').then(function(res){
				return res.renderString();
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
				assert.equal(buf.body.length, 563);
			});
		});
		it('First#error');
		it('First#watch', function(){
			var count = 0;
			var filePaths = {};
			function handleEvent(data, filepath){
				count++;
				filePaths[data.path.join('/')] = null;
			}
			return route.watch(handleEvent).then(function(){
				// Adjust this as new files are added
				assert.equal(Object.keys(filePaths).length, 4);
			});
		});
		it('First#listing', function(){
			return route.listing().then(function(listing){
				// console.log(listing);
				// We want to see listings for:
				// - directory/data-table.html
				// - data-table.html
				// - document.html
				// - document.xhtml
				// TODO it's possible to construct a First route with unreachable documents; test this.
				assert.equal(listing.length, 4);
			});
		});
		it('First#store');
		it('First#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
});
