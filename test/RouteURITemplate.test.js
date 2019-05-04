"use strict";

var assert = require('assert');
var lib = require('../index.js');
var URIReflect = require('./util.js').URIReflect;

describe('RouteURITemplate', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
			route.addRoute(new URIReflect('http://localhost/{name}', ['http://localhost/foo']));
		});
		it('RouteURITemplate#label', function(){
			assert.strictEqual(route.label, 'RouteURITemplate(1)');
		});
		it('RouteURITemplate#prepare (found)', function(){
			return route.prepare('http://localhost/foo').then(function(res){
				assert(res instanceof lib.Resource);
			});
		});
		it('RouteURITemplate#prepare (not found)', function(){
			return route.prepare('http://localhost/bar').then(function(res){
				assert(!res);
			});
		});
		it('RouteURITemplate#error');
		it('RouteURITemplate#watch');
		it('RouteURITemplate#listing');
		it('RouteURITemplate#store');
		it('RouteURITemplate#listDependents', function(){
			assert(route.listDependents().length);
		});
		// This route doesn't really need an HTTP interface test,
		// because Application and most of the other tests handle it.
	});
	describe('interface (empty)', function(){
		var route;
		beforeEach(function(){
			route = lib.RouteURITemplate();
		});
		it('RouteURITemplate#label', function(){
			assert.strictEqual(route.label, 'RouteURITemplate(0)');
		});
		it('RouteURITemplate#prepare', function(){
			return route.prepare('http://example.com/foo').then(function(res){
				assert(!res);
			});
		});
		it('RouteURITemplate#error');
		it('RouteURITemplate#watch');
		it('RouteURITemplate#listing');
		it('RouteURITemplate#store');
		it('RouteURITemplate#listDependents', function(){
			assert.equal(route.listDependents().length, 0);
		});
		// This route doesn't really need an HTTP interface test,
		// because Application and most of the other tests handle it.
	});
});
