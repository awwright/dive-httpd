"use strict";

var inherits = require('util').inherits;
var Route = require('./Route.js').Route;
var StreamResource = require('./Resource.js').StreamResource;
var URITemplate = require('uri-template-router').Route;

module.exports.RoutePipeline = RoutePipeline;

inherits(RoutePipeline, Route);

function RoutePipeline(opts, t2){
	if(!(this instanceof RoutePipeline)) return new RoutePipeline(opts, t2);
	if(t2){
		// If there's two arguments then the outer template is just the same as the inner one
		this.uriTemplate = t2.uriTemplate || opts.uriTemplate;
		this.contentType = t2.contentType;
		this.outboundTransform = t2;
		this.inboundTransform = null; // for converting PUT requests
		this.innerRoute = opts;
		this.label = t2.label || t2.name || 'RoutePipeline';
	}else{
		this.uriTemplate = opts.uriTemplate;
		this.contentType = opts.contentType;
		this.outboundTransform = opts.outboundTransform;
		this.inboundTransform = opts.inboundTransform; // for converting PUT requests
		this.innerRoute = opts.innerRoute;
		this.label = opts.label || opts.name || 'RoutePipeline';
	}
	var target = this.outboundTransform;
	if(!(this.innerRoute instanceof Route)) throw new Error('Expected `innerRoute` to be instanceof Route');
	if(!this.innerRoute.name) throw new Error('Missing name');
	if(!this.innerRoute.uriTemplate) throw new Error('Expected `innerRoute` to have a uriTemplate');
	if(Array.isArray(target)){
		this.name = this.innerRoute.name+' | '+target.map(v=>v.name).join(',')+')';
		// pipeline.contentType = target[target.length-1].contentType;
	}else{
		this.name = this.innerRoute.name+' | '+target.name;
		// pipeline.contentType = target.contentType;
	}
	this.innerRouteTemplate = new URITemplate(this.innerRoute.uriTemplate);
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
RoutePipeline.prototype.prepare = function prepare(uri){
	var route = this;
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	var innerMatch = match.rewrite(this.innerRouteTemplate);
	return this.innerRoute.prepare(innerMatch).then(function(inner){
		if(inner===undefined) return Promise.resolve();
		var contentType = route.contentType || inner.contentType;
		return Promise.resolve(new StreamResource(route, {match, inner, contentType}));
	});
};

// Call the provided function whenever a resource in the set changes
RoutePipeline.prototype.render = function render(resource, req){
	var route = this;
	var target = route.outboundTransform;
	if(Array.isArray(target)){
		return target.reduce(function(stream, transform){
			var instance = transform(resource);
			stream.pipe(instance);
			return instance;
		}, resource.inner.render.apply(resource.inner, arguments));
	}else{
		return resource.inner.render.apply(resource.inner, arguments).pipe(target(resource));
	}
};

// Call the provided function whenever a resource in the set changes
RoutePipeline.prototype.watch = function watch(cb){
	var route = this;
	return this.innerRoute.watch(function(inner, ancestor){
		var match = inner.match.rewrite(route.uriTemplate);
		var contentType = route.contentType || inner.contentType;
		return void cb(new StreamResource(route, {match, inner, contentType}), ancestor);
	});
};

// List all the URIs accessible through this route
RoutePipeline.prototype.listing = function listing(){
	var route = this;
	return this.innerRoute.listing().then(function(list){
		return list.map(function(inner){
			var match = inner.match.rewrite(route.uriTemplate);
			var contentType = route.contentType || inner.contentType;
			return new StreamResource(route, {match, inner, contentType});
		});
	});
};

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
RoutePipeline.prototype.store = function store(uri, request){
	return Promise.reject();
};

// Generate a notFound response for this route
// Fail to have a higher-level route handle
RoutePipeline.prototype.error = function error(uri, request){
	return Promise.reject();
};

RoutePipeline.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
};
