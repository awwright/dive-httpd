"use strict";

var inherits = require('util').inherits;
var TemplateRouter = require('uri-template-router');

module.exports.Route = Route;
//inherits(Route, TemplateRouter.Route);
function Route(opts){
	if(!(this instanceof Route)) return new Route(opts);
	if(opts && typeof opts=='object'){
		if(typeof opts.prepare=='function') this.prepare = opts.prepare;
		if(typeof opts.listing=='function') this.listing = opts.listing;
		if(typeof opts.store=='function') this.store = opts.store;
		if(typeof opts.error=='function') this.error = opts.error;
	}
	this.pipeline = [];
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepare = function prepare(uri){
	throw new Error(this.constructor.name.toString() + ': unimplemented');
}

// Utility function to parse a plain URI into component parts
Route.prototype.matchUri = function matchUri(uri){
	if(typeof uri==='object'){
		if(uri.uri && uri.template){
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
}

// Call the provided function whenever a resource in the set changes
Route.prototype.watch = function watch(cb){
	return Promise.reject(new Error(this.constructor.name.toString() + ': watch unimplemented'));
}

// List all the URIs accessible through this route
Route.prototype.listing = function listing(){
	return Promise.reject(new Error(this.constructor.name.toString() + ': listing unimplemented'));
}

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
Route.prototype.store = function store(uri, request){
	return Promise.reject();
}

// Generate a notFound response for this route
// Fail to have a higher-level route handle
Route.prototype.error = null;

Object.defineProperty(Route.prototype, 'routerURITemplate', {
	get: function(){ return this.uriTemplate; },
	set: function(v){ return this.uriTemplate = v; },
});
