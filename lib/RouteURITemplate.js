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
	this.uriTemplateMap = new WeakMap;
	if(routes && Array.isArray(routes)){
		routes.forEach(function(r){ self.addRoute(r); });
	}
	this.label = 'RouteURITemplate('+this.uriTemplateRouter.routes.length+')';
}

RouteURITemplate.prototype.label = 'RouteURITemplate';

RouteURITemplate.prototype.prepare = function prepare(uri, euri, queryMap, req){
	const uriTemplateMap = this.uriTemplateMap;
	if(typeof uri==='string'){
		var matchRoute = this.uriTemplateRouter.resolveURI(uri);
	}
	// Now loop through matching routes
	return testRoute(matchRoute);
	function testRoute(uriRoute){
		if(!uriRoute){
			return Promise.resolve();
		}
		const handler = uriTemplateMap.get(uriRoute.route);
		if(!handler){
			return Promise.reject(new Error('Route definition missing'));
		}
		if(typeof handler.prepare!=='function'){
			return Promise.reject(new Error('Route#prepare not a function'));
		}
		return handler.prepare(uriRoute, euri, queryMap, req).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(uriRoute.next());
		});
	}
};

// RouteURITemplate defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
RouteURITemplate.prototype.error = function error(uri, error){
	assert(error instanceof Error);
	var match = typeof uri==='string' ? this.uriTemplateRouter.resolveURI(uri) : uri;
	if(!match) return Promise.resolve();
	const uriTemplateMap = this.uriTemplateMap;
	// Now loop through matching routes
	return testRoute(match);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		const matchValue = uriTemplateMap.get(matchRoute.route);
		if(!matchValue || typeof matchValue.error!=='function'){
			return testRoute(matchRoute.next());
		}
		return matchValue.error(matchRoute, error).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		}, function(err){
			if(err instanceof Error) throw err;
			throw new Error('Route error handler rejected');
		});
	}
};

RouteURITemplate.prototype.listing = function listing(){
	const uriTemplateMap = this.uriTemplateMap;
	return Promise.all(this.uriTemplateRouter.routes.map(function(r){
		const matchRoute = uriTemplateMap.get(r);
		if(matchRoute && matchRoute.listing){
			return matchRoute.listing().then(function(v){
				v.forEach((w) => assert(w, matchRoute.name));
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
	if(!(route.uriRoute instanceof TemplateRouter.Route)) throw new Error('Expected route.uriRoute to be an instanceof Route');
	const uriRoute = route.uriRoute;
	this.uriTemplateRouter.addTemplate(uriRoute);
	this.uriTemplateMap.set(uriRoute, route);
	this.label = 'RouteURITemplate('+this.uriTemplateRouter.routes.length+')';
	this.onReady = Promise.all(this.listDependents().map(function(route){
		return route.onReady;
	}));
};

Object.defineProperty(RouteURITemplate.prototype, 'routes', {
	get: function routes_get(){ return this.uriTemplateRouter.routes; },
});

RouteURITemplate.prototype.listDependents = function listDependents(){
	const uriTemplateMap = this.uriTemplateMap;
	return this.uriTemplateRouter.routes.map(function(v){ return uriTemplateMap.get(v); });
};

RouteURITemplate.prototype.initialize = function initialize(){
	const uriTemplateMap = this.uriTemplateMap;
	if(this.initializeComplete) return this.initializeComplete;
	return this.initializeComplete = Promise.all(this.uriTemplateRouter.routes.filter(function(route){
		const matchValue = uriTemplateMap.get(route);
		return typeof matchValue.initialize === 'function';
	}).map(function(route){
		return uriTemplateMap.get(route).initialize();
	}));
};
