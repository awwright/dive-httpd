"use strict";

var inherits = require('util').inherits;
var assert = require('assert');

var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;

module.exports.RouteURITemplate = RouteURITemplate;
inherits(RouteURITemplate, Route);
function RouteURITemplate(routes){
	if(!(this instanceof RouteURITemplate)) return new RouteURITemplate(routes);
	var self = this;
	this.uriTemplateRouter = new TemplateRouter.Router();
	if(routes && Array.isArray(routes)){
		routes.forEach(function(r){ self.addRoute(r); });
	}
	this.label = 'RouteURITemplate('+this.uriTemplateRouter.routes.length+')';
}

RouteURITemplate.prototype.label = 'RouteURITemplate';

RouteURITemplate.prototype.prepare = function prepare(uri, euri, queryMap, req){
	if(typeof uri==='string'){
		var matchRoute = this.uriTemplateRouter.resolveURI(uri);
	}
	// Now loop through matching routes
	return testRoute(matchRoute);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.matchValue;
		if(!handler){
			return Promise.reject(new Error('Route definition missing'));
		}
		if(typeof handler.prepare!=='function'){
			return Promise.reject(new Error('Route#prepare not a function'));
		}
		return handler.prepare(matchRoute, euri, queryMap, req).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		});
	}
};

// RouteURITemplate defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
RouteURITemplate.prototype.error = function error(uri, error){
	assert(error instanceof Error);
	var match = typeof uri==='string' ? this.uriTemplateRouter.resolveURI(uri) : uri;
	if(!match) return Promise.resolve();
	// Now loop through matching routes
	return testRoute(match);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.matchValue;
		if(!handler || typeof handler.error!=='function'){
			return testRoute(matchRoute.next());
		}
		return handler.error(matchRoute, error).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		}, function(err){
			if(err instanceof Error) throw err;
			throw new Error('Route error handler rejected');
		});
	}
};

RouteURITemplate.prototype.listing = function listing(){
	var uriTemplateRouter = this.uriTemplateRouter;
	return Promise.all(uriTemplateRouter.routes.map(function(r){
		if(r.matchValue && r.matchValue.listing){
			return r.matchValue.listing().then(function(v){
				v.forEach((w) => assert(w, r.matchValue.name));
				return v;
			});
		}else{
			return Promise.resolve([]);
		}
	})).then(function(lists){
		return lists.flat();
	});
};

RouteURITemplate.prototype.addRoute = function addRoute(route){
	if(!(route instanceof Route)) throw new Error('Expected route to be an instanceof Route');
	var uriTemplate = route.uriTemplate;
	if(typeof uriTemplate !== 'string') throw new Error('Expected route.uriTemplate to be a string');
	var options = (typeof route.uriTemplate==='object') ? route.routerOptions : {} ;
	this.uriTemplateRouter.addTemplate(uriTemplate, options, route);
	this.label = 'RouteURITemplate('+this.uriTemplateRouter.routes.length+')';
	this.onReady = Promise.all(this.listDependents().map(function(route){
		return route.onReady;
	}));
};

Object.defineProperty(RouteURITemplate.prototype, 'routes', {
	get: function routes_get(){ return this.uriTemplateRouter.routes; },
});

RouteURITemplate.prototype.listDependents = function listDependents(){
	return this.uriTemplateRouter.routes.map(function(v){ return v.matchValue; });
};

RouteURITemplate.prototype.initialize = function initialize(){
	if(this.initializeComplete) return this.initializeComplete;
	return this.initializeComplete = Promise.all(this.uriTemplateRouter.routes.filter(function(route){
		return route && route.matchValue && typeof route.matchValue.initialize === 'function';
	}).map(function(route){
		return route.matchValue.initialize();
	}));
};
