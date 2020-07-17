"use strict";

var assert = require('assert');

var lib = require('../index.js');

describe('Cache', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var source = lib.Route({
				name: 'Route',
				uriTemplate: 'http://example.com/~{user}.txt',
				contentType: 'text/plain',
				prepare: function(uri){
					var match = this.matchUri(uri);
					if(!match.data.user || match.data.user.length < 4){
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
	});
});
