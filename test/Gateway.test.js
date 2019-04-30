
var http = require('http');
var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');

describe('Gateway', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.Gateway({
				uriTemplate: 'http://localhost/{path}'
			});
		});
		it('Gateway#label', function(){
			assert.strictEqual(route.label, 'Gateway');
		});
		it('Gateway#prepare', function(){
			return route.prepare('http://localhost/foo').then(function(resource){
				assert(resource instanceof lib.Resource);
			});
		});
		it('Gateway#error');
		it('Gateway#watch');
		it('Gateway#listing');
		it('Gateway#store');
		it('Gateway#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
	describe('app', function(){
		var app, originServer;
		before(function(){
			originServer = http.createServer(function(req, res){
				res.setHeader('Content-Type', 'text/plain');
				res.end(req.url);
			}).listen(0);
			var originAddress = originServer.address();

			app = new lib.HTTPServer;
			app.addRoute(lib.Gateway({
				uriTemplate: 'http://example.com/{+foo}',
				remoteHost: originAddress.address,
				remotePort: originAddress.port,
			}));
			app.onError = function handleError(req, err){
				throw err;
			}
		});
		after(function(){
			// FIXME use a stream or something
			originServer.close();
		});
		it('Request', function(){
			return testMessage(app, [
				'GET http://example.com/test-path HTTP/1.1',
				'Host: example.com',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/test-path/));
			});
		});
	});
});
