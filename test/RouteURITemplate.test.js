"use strict";

var assert = require('assert');
var lib = require('../index.js');

describe('RouteURITemplate', function(){
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
		// This route doesn't really need an HTTP interface test,
		// because HTTPServer and most of the other tests handle it.
	});
});
