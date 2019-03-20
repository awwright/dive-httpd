"use strict";

var inherits = require('util').inherits;

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;
var PassThrough = require('http-transform').PassThrough;

// RouteGenerated: resource has a fixed, static body programmatically related to its URI.
// Expect this to be used mostly for testing and example purposes.
exports.RouteGenerated = RouteGenerated;
inherits(RouteGenerated, Route);
function RouteGenerated(uritemplate, options){
	if(!(this instanceof RouteGenerated)) return new RouteGenerated(uritemplate, options);
	this.routerURITemplate = uritemplate;
	if(typeof options==='object'){
		if(options.contentType) this.contentType = options.contentType;
		if(options.generateBody) this.generateBody = options.generateBody;
	}
}
RouteGenerated.prototype.prepare = function prepare(match){
	var body = this.generateBody(match.uri, match.data);
	if(body){
		return Promise.resolve(new ResourceGenerated(this, body));
	}else{
		return Promise.resolve();
	}
}

inherits(ResourceGenerated, Resource);
function ResourceGenerated(route, body){
	this.route = route;
	this.body = body;
}
ResourceGenerated.prototype.render = function(req, res, matchRoute, euri, queryMap, options){
	var stream = new PassThrough;
	stream.setHeader('Content-Type', this.route.contentType);
	stream.end(this.body);
	return stream;
}
