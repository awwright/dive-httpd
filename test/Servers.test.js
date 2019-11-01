
var assert = require('assert');
var http = require('http');

var testMessage = require('./util.js').testMessage;
var writeMessage = require('./util.js').writeMessage;
var URIReflect = require('./util.js').URIReflect;

var lib = require('../index.js');

describe('HTTPServer (HTTP/1.1)', function(){
	describe('interface', function(){
		it('app argument required', function(){
			assert.throws(function(){
				new lib.HTTPServer();
			});
		});
	});
	describe('Effective Request URI', function(){
		it('no options', function(){
			var app = new lib.Application;
			app.addRoute(new URIReflect('{+uri}'));
			var listener = new lib.HTTPServer(app);
			var server = http.createServer(listener.callback());
			return writeMessage(server, [
				'GET / HTTP/1.1',
				'Host: localhost',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^http:\/\/localhost\/$/m));
			});
		});
		it('fixed scheme (origin-form)', function(){
			var app = new lib.Application;
			app.fixedScheme = 'ftp';
			app.addRoute(new URIReflect('{+uri}'));
			return testMessage(app, [
				'GET / HTTP/1.1',
				'Host: localhost:8080',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^ftp:\/\/localhost:8080\/$/m));
			});
		});
		it('fixed authority (origin-form)', function(){
			var app = new lib.Application;
			app.fixedAuthority = 'example.com';
			app.addRoute(new URIReflect('{+uri}'));
			return testMessage(app, [
				'GET / HTTP/1.1',
				'Host: localhost:8080',
			]).then(function(res){
				assert(res.toString().match(/^HTTP\/1.1 200 /));
				assert(res.toString().match(/^http:\/\/example.com\/$/m));
			});
		});
	});
});
