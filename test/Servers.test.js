"use strict";

var assert = require('assert');
var http = require('http');

var testMessage = require('./util.js').testMessage;
var writeMessage = require('./util.js').writeMessage;
var URIReflect = require('./util.js').URIReflect;

var lib = require('../index.js');

function createServer(callback){
	return http.createServer({requireHostHeader: false}, callback);
}

describe('HTTPServer (HTTP/1.1)', function(){
	describe('interface', function(){
		it('app argument required', function(){
			assert.throws(function(){
				new lib.HTTPServer();
			});
		});
	});
	describe('Effective Request URI', function(){
		describe('no options', function(){
			it('origin-form', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET / HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^http:\/\/localhost\/$/m);
				});
			});
			it('origin-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET / HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('origin-form, multiple Host headers', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET / HTTP/1.1',
					'Host: localhost',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET ftp://localhost/ HTTP/1.1',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost\/$/m);
				});
			});
			it('absolute-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET ftp://localhost/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form, no Host, relaxedHost', function(){
				var app = new lib.Application({debug:true});
				app.relaxedHost = true;
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET ftp://localhost/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost\/$/m);
				});
			});
			it('absolute-form, multiple Host headers', function(){
				var app = new lib.Application({debug:true});
				app.addRoute(new URIReflect('{+uri}'));
				var listener = new lib.HTTPServer(app);
				var server = createServer(listener.callback());
				return writeMessage(server, [
					'GET ftp://localhost/ HTTP/1.1',
					'Host: localhost',
					'Host: localhost',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
		});
		describe('fixed scheme', function(){
			it('origin-form', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET / HTTP/1.1',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost:8080\/$/m);
				});
			});
			it('origin-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET / HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('origin-form, multiple Host headers', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET http://localhost:8080/ HTTP/1.1',
					'Host: localhost:8080',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET http://localhost:8080/ HTTP/1.1',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost:8080\/$/m);
				});
			});
			it('absolute-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET http://localhost:8080/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form, no Host, relaxedHost', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.relaxedHost = true;
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET http://localhost:8080/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost:8080\/$/m);
				});
			});
			it('absolute-form, no Host, relaxedHost', function(){
				var app = new lib.Application({debug:true});
				app.fixedScheme = 'ftp';
				app.relaxedHost = true;
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET http://localhost:8080/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^ftp:\/\/localhost:8080\/$/m);
				});
			});
		});
		describe('fixed authority', function(){
			it('origin-form', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET / HTTP/1.1',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^http:\/\/example.com\/$/m);
				});
			});
			it('origin-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET / HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('origin-form, multiple Host headers', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET / HTTP/1.1',
					'Host: localhost:8080',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET https://localhost:8080/ HTTP/1.1',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^https:\/\/example.com\/$/m);
				});
			});
			it('absolute-form, no Host', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET https://localhost:8080/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
			it('absolute-form, no Host, relaxedHost', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.relaxedHost = true;
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET https://localhost:8080/ HTTP/1.1',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 200 /);
					assert.match(res.toString(), /^https:\/\/example.com\/$/m);
				});
			});
			it('absolute-form, multiple Host headers', function(){
				var app = new lib.Application({debug:true});
				app.fixedAuthority = 'example.com';
				app.addRoute(new URIReflect('{+uri}'));
				return testMessage(app, [
					'GET https://localhost:8080/ HTTP/1.1',
					'Host: localhost:8080',
					'Host: localhost:8080',
				]).then(function(res){
					assert.match(res.toString(), /^HTTP\/1.1 400 /);
				});
			});
		});
	});
});
