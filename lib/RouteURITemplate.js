"use strict";

var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;
var inherits = require('util').inherits;

module.exports.RouteURITemplate = RouteURITemplate;
inherits(RouteURITemplate, Route);
function RouteURITemplate(routes){
	if(!(this instanceof RouteURITemplate)) return new RouteURITemplate(routes);
	var self = this;
	this.routes = new TemplateRouter.Router();
	if(routes && Array.isArray(routes)){
		routes.forEach(function(r){ self.addRoute(r); });
	}
	this.label = 'RouteURITemplate('+this.routes.routes.length+')';
}

RouteURITemplate.prototype.label = 'RouteURITemplate';

// Implementations of Route#request have to either:
// 0. Return a promise and write to `res`
// 1. Call an return pass() to defer the request to a downstream route; will resolve to `res` when the request is completed.
RouteURITemplate.prototype.request = function request(req, res, pass){
	if(typeof req.uri !== 'string'){
		throw new Error('Expected request.uri to be a string');
	}
	if(typeof req.uri==='string'){
		var matchRoute = this.routes.resolveURI(req.uri);
	}
	// Now loop through matching routes
	return testRoute(matchRoute);
	function testRoute(matchRoute){
		if(!matchRoute){
			return pass();
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.request!=='function'){
			return testRoute(matchRoute.next());
		}
		function next(){
			return testRoute(matchRoute.next());
		}
		return handler.request(req, res, next);
	}
}

RouteURITemplate.prototype.prepare = function prepare(uri, euri, queryMap, req){
	if(typeof uri==='string'){
		var matchRoute = this.routes.resolveURI(uri);
	}
	// Now loop through matching routes
	return testRoute(matchRoute);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.name;
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
}

// RouteURITemplate defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
RouteURITemplate.prototype.error = function error(uri, error){
	var match = typeof uri==='string' ? this.routes.resolveURI(uri) : uri;
	if(!match) return Promise.resolve();
	// Now loop through matching routes
	return testRoute(match);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.error!=='function'){
			return testRoute(matchRoute.next());
		}
		return handler.error(matchRoute, error).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		});
	}
}

RouteURITemplate.prototype.listing = function listing(){
	var uriTemplateRouter = this.routes;
	return Promise.all(uriTemplateRouter.routes.map(function(r){
		if(r.name && r.name.listing){
			return r.name.listing();
		}else{
			return Promise.resolve([]);
		}
	})).then(function(lists){
		var reduced = [];
		lists.forEach(function(list, i){
			var route = uriTemplateRouter.routes[i];
			// console.log('# '+route.template);
			// console.log(route.name.constructor);
			list.forEach(function(params){
				// console.log(params);
				reduced.push(route.name.generateUri(params));
			});
		});
		return reduced;
	});
}

RouteURITemplate.prototype.addRoute = function addRoute(route){
	if(!(route instanceof Route)) throw new Error('Expected route to be an instanceof Route');
	var uriTemplate = route.uriTemplate;
	if(typeof uriTemplate !== 'string') throw new Error('Expected route.uriTemplate to be a string');
	var options = (typeof route.uriTemplate==='object') ? route.routerOptions : {} ;
	this.routes.addTemplate(uriTemplate, options, route);
	this.label = 'RouteURITemplate('+this.routes.routes.length+')';
}

RouteURITemplate.prototype.listDependents = function listDependents(){
	return this.routes.routes.map(function(v){ return v.name; });
}
