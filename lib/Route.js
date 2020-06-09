"use strict";

// var inherits = require('util').inherits;
var TemplateRouter = require('uri-template-router');

module.exports.Route = Route;
//inherits(Route, TemplateRouter.Route);
function Route(opts){
	if(!(this instanceof Route)) return new Route(opts);
	if(opts && typeof opts=='object'){
		if(typeof opts.uriTemplate=='string') this.uriTemplate = opts.uriTemplate;
		if(typeof opts.contentType=='string') this.contentType = opts.contentType;
		if(typeof opts.name=='string') this.name = opts.name;
		if(typeof opts.prepare=='function') this.prepare = opts.prepare;
		if(typeof opts.prepareMatch=='function') this.prepareMatch = opts.prepareMatch;
		if(typeof opts.allocate=='function') this.allocate = opts.allocate;
		if(typeof opts.allocateMatch=='function') this.allocateMatch = opts.allocateMatch;
		if(typeof opts.listing=='function') this.listing = opts.listing;
		if(typeof opts.store=='function') this.store = opts.store;
		if(typeof opts.error=='function') this.error = opts.error;
		if(typeof opts.watch=='function') this.watch = opts.watch;
		if(typeof opts.render=='function') this.render = opts.render;
	}
	this.pipeline = [];
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepare = function prepare(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return this.prepareMatch(match);
};

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepareMatch = function prepareMatch(uri){
	throw new Error(this.constructor.name.toString() + '#prepareMatch: unimplemented');
};

// Resolve to a Resource object if something can be stored at the given URI, even if it doesn't already exist
// Usually only called for a PUT/PATCH request if a previous prepare call yielded no result
Route.prototype.allocate = function allocate(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return this.allocateMatch(match);
};

Route.prototype.allocateMatch = function allocateMatch(match){
	return Promise.resolve();
};

// Utility function to parse a plain URI into component parts
Route.prototype.matchUri = function matchUri(uri){
	if(typeof uri==='object'){
		if(uri.uri && uri.uriTemplate){
			return uri;
		}else{
			throw new Error('Expected TemplateRouter.Result or string');
		}
	}
	if(typeof uri==='string'){
		// - uriTemplate is the string URI Template in question
		// - uriTemplateRouter is an instance of Router that resolves only the uriTemplate
		if(!this.uriTemplateRouter){
			this.uriTemplateRouter = new TemplateRouter.Router();
			this.uriTemplateRouter.addTemplate(this.uriTemplate);
		}
		return this.uriTemplateRouter.resolveURI(uri);
	}
};

// Utility function to parse a plain URI into component parts
Route.prototype.generateUri = function generateUri(data){
	if(typeof data!=='object'){
		throw new Error('Expected object `data`');
	}
	if(!this.uriTemplateRouter){
		this.uriTemplateRouter = new TemplateRouter.Router();
		this.uriTemplateRouter.addTemplate(this.uriTemplate);
	}
	return this.uriTemplateRouter.routes[0].gen(data);
};

// Call the provided function whenever a resource in the set changes
Route.prototype.watch = function watch(cb){
	return Promise.reject(new Error(this.constructor.name.toString() + '#watch unimplemented'));
};

// List all the URIs accessible through this route
Route.prototype.listing = function listing(){
	return Promise.reject(new Error(this.constructor.name.toString() + '#listing unimplemented'));
};

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
Route.prototype.store = function store(uri, request){
	return Promise.reject();
};

// Generate a notFound response for this route
// Fail to have a higher-level route handle
Route.prototype.error = null;

Object.defineProperty(Route.prototype, 'routerURITemplate', {
	get: function(){ return this.uriTemplate; },
	set: function(v){ return this.uriTemplate = v; },
});

// Resolve when all data sources are connected, indexes are built, etc.
// By default, assume they are.
Route.prototype.onReady = Promise.resolve();
