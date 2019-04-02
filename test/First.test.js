
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
		it('First#watch', function(done){
			var count = 0;
			route.watch(function(data, filepath){
				count++;
				if(data.path && data.path.length===2 && data.path[0]==='directory' && data.path[1]==='data-table'){
					return void done();
				}
				// if(count>=2) assert.fail();
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
	});
});
