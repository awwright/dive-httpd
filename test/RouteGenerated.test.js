
var assert = require('assert');
var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');

describe('RouteGenerated', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
				list: [{user:'root'}, {user:'guest'}],
			});
		});
		it('RouteGenerated#name', function(){
			assert.strictEqual(route.name, 'RouteGenerated');
		});
		it('RouteGenerated#label', function(){
			assert.strictEqual(route.label, 'RouteGenerated');
		});
		it('RouteGenerated#prepare (200)', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://example.com/~root');
				assert.equal(res.contentType, 'text/plain');
			});
		});
		it('RouteGenerated#prepare (404)', function(){
			return route.prepare('http://example.com/~foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteGenerated#prepare uri', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.uri, 'http://example.com/~root');
			});
		});
		it('RouteGenerated#prepare params', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.params.user, 'root');
			});
		});
		it('RouteGenerated#prepare route', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				assert.strictEqual(res.route, route);
			});
		});
		it('RouteGenerated#prepare renderStream', function(){
			return route.prepare('http://example.com/~root').then(function(res){
				var stream = res.render();
				assert(stream.pipe);
				return stream.headersReady.then(function(){ return stream; });
			}).then(function(buf){
				// assert.equal(buf.statusCode, 200);
			});
		});
		it('RouteGenerated#error');
		it('RouteGenerated#watch', function(done){
			var count = 0;
			route.watch(function(data, filepath){
				count++;
				if(data.user==='guest') return void done();
				// if(count>=2) assert.fail();
			});
		});
		it('RouteGenerated#listing', function(){
			return route.listing().then(function(list){
				assert.equal(list.length, 2);
				var values = list.map(function(v){ return v.user; }).sort();
				assert.equal(values[0], 'guest');
				assert.equal(values[1], 'root');
			});
		});
		it('RouteGenerated#store');
		it('RouteGenerated#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('HTTP tests', function(){
		var server;
		beforeEach(function(){
			server = new lib.HTTPServer;
			var route = lib.RouteGenerated('http://example.com/~{user}', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					return data.user + "\r\n";
				},
			});
			server.addRoute(route);
		});
		it('resource that exists (origin-form)', function(){
			return testMessage(server, [
				'GET /~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
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
				'GET http://example.com/~root HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^root$/m));
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
	});
});
