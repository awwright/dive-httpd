"use strict";

var assert = require('assert');
var lib = require('../index.js');
var URIReflect = require('./util.js').URIReflect;

describe('RouteLocalReference', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			var src = new URIReflect;
			route = lib.RouteLocalReference('http://localhost{/path*}/', src, 'http://localhost{/path*}/index');
		});
		it('RouteLocalReference#name', function(){
			assert.strictEqual(route.name.substring(0,19), 'RouteLocalReference');
		});
		it('RouteLocalReference#label', function(){
			assert.strictEqual(route.label, 'RouteLocalReference(http://localhost{/path*}/index)');
		});
		it('RouteLocalReference#prepare (200)', function(){
			return route.prepare('http://localhost/').then(function(res){
				assert(res);
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://localhost/index');
			});
		});
		it('RouteLocalReference#prepare (404)', function(){
			return route.prepare('http://localhost/index').then(function(res){
				assert(!res);
			});
		});
		it('RouteLocalReference#prepare uri', function(){
			return route.prepare('http://localhost/').then(function(res){
				assert.strictEqual(res.uri, 'http://localhost/index');
			});
		});
		it('RouteLocalReference#error');
		it('RouteLocalReference#watch');
		it('RouteLocalReference#listing');
		it('RouteLocalReference#store');
		it('RouteLocalReference#listDependents', function(){
			assert(route.listDependents().length);
		});
		it('RouteLocalReference#uriTemplate', function(){
			assert.strictEqual(route.uriTemplate, 'http://localhost{/path*}/');
		});
		it('RouteLocalReference#uriTemplateRoute', function(){
			assert.strictEqual(route.uriTemplateRoute.uriTemplate, route.uriTemplate);
		});
	});
	describe('interface (series)', function(){
		var route;
		beforeEach(function(){
			// RouteLocalReference "collapses" variables, unlike in Negotiate, etc,
			// variable parameters are not sent inbound.
			// If variables were sent inbound, then the second RouteLocalReference would always
			// resolve to <http://localhost//index> because `b` would be undefined (only `a` is).
			var src = new URIReflect;
			var aaa = lib.RouteLocalReference('http://localhost/{b}/index', src, 'http://localhost/{b}/toc');
			route = lib.RouteLocalReference('http://localhost/{a}/', aaa, 'http://localhost/{a}/index');
		});
		it('RouteLocalReference#prepare', function(){
			return route.prepare('http://localhost/foo/').then(function(res){
				assert(res);
				assert(res instanceof lib.Resource);
				assert.equal(res.uri, 'http://localhost/foo/toc');
			});
		});
	});
});
