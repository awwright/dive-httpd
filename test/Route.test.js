"use strict";

var assert = require('assert');
// var testMessage = require('./util.js').testMessage;
var lib = require('../index.js');
const Route = lib.Route;

describe('Route', function(){
	describe('domain', function(){
		describe('new Route(uriTemplate, options)', function(){
			it('options.uriTemplate must be a string', function(){
				assert.throws(function(){
					new Route({uriTemplate: true});
				}, /options.uriTemplate must be a string/);
			});
			it('options.contentType must be a string', function(){
				assert.throws(function(){
					new Route({contentType: true});
				}, /options.contentType must be a string/);
			});
			it.skip('options.contentType must be a valid media type', function(){
				assert.throws(function(){
					new Route({contentType: 'foo baz'});
				}, /options.contentType must be a media type name/);
			});
			it('options.name must be a string', function(){
				assert.throws(function(){
					new Route({name: true});
				}, /options.name must be a string/);
			});
			it('options.prepare must be a function', function(){
				assert.throws(function(){
					new Route({prepare: true});
				}, /options.prepare must be a function/);
			});
			it('options.prepare_match must be a function', function(){
				assert.throws(function(){
					new Route({prepare_match: true});
				}, /options.prepare_match must be a function/);
			});
			it('options.innerRoute must be an instanceof Route', function(){
				assert.throws(function(){
					new Route({innerRoute: function(){}});
				}, /options.innerRoute must be a Route/);
			});
			it('options.allocate must be a function', function(){
				assert.throws(function(){
					new Route({allocate: true});
				}, /options.allocate must be a function/);
			});
			it('options.allocateMatch must be a function', function(){
				assert.throws(function(){
					new Route({allocateMatch: true});
				}, /options.allocateMatch must be a function/);
			});
			it('options.listing must be a function', function(){
				assert.throws(function(){
					new Route({listing: true});
				}, /options.listing must be a function/);
			});
			it('options.store must be a function', function(){
				assert.throws(function(){
					new Route({store: true});
				}, /options.store must be a function/);
			});
			it('options.error must function', function(){
				assert.throws(function(){
					new Route({error: true});
				}, /options.error must be a function/);
			});
			it('options.watch must function', function(){
				assert.throws(function(){
					new Route({watch: true});
				}, /options.watch must be a function/);
			});
			it('options.render must function', function(){
				assert.throws(function(){
					new Route({render: true});
				}, /options.render must be a function/);
			});
		});
	});
	describe('interface', function(){
		// Ensure that the constructor options are equivalent  to setting
		// the properties on the instance
		describe('new Route(uriTemplate, options)', function(){
			it('options.uriTemplate', function(){
				const route = new Route({uriTemplate: 'http://localhost/{id}'});
				assert(route.uriTemplate);
			});
			it('options.contentType', function(){
				const route = new Route({contentType: 'text/plain'});
				assert.strictEqual(route.contentType, 'text/plain');
			});
			it('options.name', function(){
				const route = new Route({name: 'MyRoute'});
				assert.strictEqual(route.name, 'MyRoute');
			});
			it('options.prepare', function(){
				function prepare(){
					// TODO
				}
				const route = new Route({prepare});
				assert.strictEqual(route.prepare, prepare);
			});
			it('options.prepare_match', function(){
				function prepare_match(){
					// TODO
				}
				const route = new Route({prepare_match});
				assert.strictEqual(route.prepare_match, prepare_match);
			});
			it('options.innerRoute', function(){
				const innerRoute = new lib.Route('http://example.com/{foo}');
				const route = new Route({innerRoute});
				assert.strictEqual(route.innerRoute, innerRoute);
			});
			it('options.allocate', function(){
				function allocate(){
					// TODO
				}
				const route = new Route({allocate});
				assert.strictEqual(route.allocate, allocate);
			});
			it('options.allocateMatch', function(){
				function allocateMatch(){
					// TODO
				}
				const route = new Route({allocateMatch});
				assert.strictEqual(route.allocateMatch, allocateMatch);
			});
			it('options.listing', function(){
				function listing(){
					// TODO
				}
				const route = new Route({listing});
				assert.strictEqual(route.listing, listing);
			});
			it('options.store', function(){
				function store(){
					// TODO
				}
				const route = new Route({store});
				assert.strictEqual(route.store, store);
			});
			it('options.error', function(){
				function error(){
					// TODO
				}
				const route = new Route({error});
				assert.strictEqual(route.error, error);
			});
			it('options.watch', function(){
				function watch(){
					// TODO
				}
				const route = new Route({watch});
				assert.strictEqual(route.watch, watch);
			});
			it('options.render', function(){
				function render(){
					// TODO
				}
				const route = new Route({render});
				assert.strictEqual(route.render, render);
			});
		});
		describe('Route#prepare_match', async function(){
			it('Route#prepare calls Route#prepare_match by default (resolve)', async function(){
				const route = new Route({uriTemplate: 'http://localhost/~{name}'});
				route.prepare_match = async function prepare_match(match){
					return (match.data.name.length > 2);
				};
				const rsc = await route.prepare('http://localhost/~foo');
				assert(rsc);
				assert.strictEqual(rsc.uri, 'http://localhost/~foo');
				assert.strictEqual(rsc.uriTemplate, 'http://localhost/~{name}');
				assert.strictEqual(rsc.params.name, 'foo');
			});
			it('Route#prepare calls Route#prepare_match by default (not found)', async function(){
				const route = new Route({uriTemplate: 'http://localhost/~{name}'});
				var called = false;
				route.prepare_match = async function prepare_match(match){
					called = true;
					return;
				};
				const rsc = await route.prepare('http://localhost/~foo');
				assert(!rsc);
				assert(called);
			});
			it('Route#prepare calls Route#prepare_match by default (mismatch)', async function(){
				const route = new Route({uriTemplate: 'http://localhost/~{name}'});
				route.prepare_match = async function prepare_match(match, resolve){
					assert.fail('Must not call');
				};
				const rsc = await route.prepare('http://localhost/foo');
				assert(!rsc);
			});
		});
		describe('Route#allocateMatch', function(){
			it.skip('Route#allocateMatch', function(){
				const route = new Route;
				route.allocateMatch = function allocateMatch(){
	
				};
			});
		});
	});
	it('Throws error if inner.render() does not return a stream', function(){
		const inner = new lib.Route({
			uriTemplate: 'http://localhost/~{name}',
			contentType: 'text/plain',
			prepare: function(uri){
				var match = this.matchUri(uri);
				if(!match) return Promise.resolve();
				return Promise.resolve(new lib.Resource(this, {match}));
			},
			render: function(resource){
				return function(){};
			},
		});
		return assert.rejects(inner.prepare('http://localhost/~root').then(function(resource){
			resource.render();
		}), /did not return a Response/);
	});
});
