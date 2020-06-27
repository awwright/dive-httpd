"use strict";

var inherits = require('util').inherits;

var accepts = require('accepts');
var ResponsePassThrough = require('http-transform').ResponsePassThrough;
var URITemplate = require('uri-template-router').Route;
var URITemplateRouter = require('uri-template-router').Router;

var Route = require('./Route.js').Route;
var Resource = require('./Route.js').Resource;

// TODO: Allow Negotiate to be extensible with a function to negotiate based on any parameter

module.exports.Negotiate = Negotiate;
inherits(Negotiate, Route);
function Negotiate(uriTemplate, routes){
	if(!(this instanceof Negotiate)) return new Negotiate(uriTemplate, routes);
	if(!Array.isArray(routes)) throw new Error('Expected arguments[1] `routes` to be an Array');
	Route.call(this);
	this.uriTemplate = uriTemplate;
	routes.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
		if(typeof item.uriTemplate !== 'string')  throw new Error('Expected `routes[i].uriTemplate` to be a string');
	});
	this.routes = routes;
	this.routesParsed = routes.map(function(item){
		return new URITemplate(item.uriTemplate);
	});
	this.routeParsed = new URITemplateRouter();
	this.routeParsed.addTemplate(this.uriTemplate, {}, this);
	// TODO set this.lastModified to the latest of any of the resources
	// Then, in Negotiate#render, respond with 304 Not Modified if the Application test missed because one variant is newer than the one being served.
	// (That should rarely happen, but it's technically possible.)
	this.label = 'Negotiate('+routes.length+')';
	this.name = this.label + ' [' + routes.map(function(v){ return v.name; }).join(' , ') + ']';
	// Keep a map of open event hooks
	// Honestly I don't know how to do this functionally
	this.watchWaiting = new Map;
}
Negotiate.prototype.label = 'Negotiate';
Negotiate.prototype.prepare = function prepare(uri){
	var self = this;
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	return Promise.all(self.routes.map(function(route, i){
		// Map the outer URI to the inner URI
		var cousin = self.routesParsed[i];
		return route.prepare(match.rewrite(cousin));
	})).then(function(resources){
		if(resources.some(function(v){ return !!v; })){
			return Promise.resolve(new Resource(self, {match}, {resources, vary:['Accept']}));
		}else{
			// If none of the underlying resources exist, then neither do we
			return Promise.resolve();
		}
	});
};
Negotiate.prototype.listing = function listing(){
	var self = this;
	return Promise.all(this.routes.map(function(route){
		return route.listing();
	})).then(function(routes){
		var list = [];
		var list_s = [];
		routes.forEach(function(listing){
			listing.forEach(function(rsc){
				var json = JSON.stringify(rsc.params);
				if(list_s.indexOf(json)<0){
					list_s.push(json);
					var match = rsc.match.rewrite(self.uriTemplate);
					list.push(self.prepare(match));
				}
			});
		});
		return Promise.all(list);
	});
};
Negotiate.prototype.watch = function watch(fn){
	// Send watch to all subroutes
	// Resolve when all subroute.watch calls resolve
	// Call fn when all subroutes have updated
	var self = this;
	var waiting = [];
	return Promise.all(this.routes.map(function(route){
		function onUpdate(inner, ancestor){
			var event;
			var match = inner.match.rewrite(self.uriTemplate);
			if(self.watchWaiting.has(ancestor)){
				event = self.watchWaiting.get(ancestor);
			}else{
				event = new Map;
				self.watchWaiting.set(ancestor, event);
			}
			event.set(route, inner);
			if(event.size===self.routes.length){
				var resources = self.routes.map(function(route){
					return event.get(route);
				});
				self.watchWaiting.delete(ancestor);
				fn(new Resource(self, {match}, {resources, vary:['Accept']}), ancestor);
			}
		}
		return route.watch(onUpdate);
	})).then(function(){
		return Promise.all(waiting);
	});
};
Negotiate.prototype.listDependents = function listDependents(){
	return this.routes.slice();
};
Negotiate.prototype.render = function render(resource, req){
	if(typeof req!=='object') throw new Error('Expected `req`');
	if(typeof req.headers!=='object') throw new Error('Expected `req.headers`');
	// Pick the best match based on the request, then call that resource's render
	var types = {};
	var typeList = [];
	resource.resources.forEach(function(v){
		if(!v) return;
		var ct = v && (v.contentType || v.route.contentType);
		if(ct){
			types[ct] = v;
			typeList.push(ct);
		}else{
			throw new Error('Resource has no exposed contentType');
		}
	});
	var selectedType = accepts(req).type(typeList);
	var selectedResource = types[selectedType];
	if(!selectedResource) throw new Error('Assertion error: Unknown resource');
	var source = selectedResource.render(req);
	var wrapped = new ResponsePassThrough;
	source.headersReady.then(function(){
		source.pipe(wrapped);
		wrapped.setHeader('Content-Location', selectedResource.uri);
		wrapped.addHeader('Vary', 'Accept');
	});
	source.on('error', function(err){ wrapped.emit('error', err); });
	return wrapped.clientReadableSide;
};
