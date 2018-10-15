"use strict";

var inherits = require('util').inherits;
var TemplateRouter = require('uri-template-router');

module.exports.Route = Route;
//inherits(Route, TemplateRouter.Route);
function Route(opts){
	if(!(this instanceof Route)) return new Route(opts);
	if(opts && typeof opts=='object'){
		if(typeof opts.prepare=='function') this.prepare = opts.prepare;
		if(typeof opts.index=='function') this.index = opts.index;
		if(typeof opts.store=='function') this.store = opts.store;
		if(typeof opts.error=='function') this.error = opts.error;
	}
	this.pipeline = [];
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepare = function prepare(uri, data){
	throw new Error(this.constructor.name.toString() + ': unimplemented');
}

// List all the URIs accessible through this route
Route.prototype.index = function index(){
	throw new Error('unimplemented');
}

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
Route.prototype.store = function store(uri, request){
	return Promise.fail();
}

// Generate a notFound response for this route
// Fail to have a higher-level route handle
Route.prototype.error = function error(uri, request){
	return Promise.fail();
}



