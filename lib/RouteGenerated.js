"use strict";

var inherits = require('util').inherits;
var TemplateRouter = require('uri-template-router');

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
		if(options.list) this.list = options.list;
		if(options.name) this.name = options.name;
	}
	this.routes = new TemplateRouter.Router();
	this.routes.addTemplate(this.routerURITemplate, {}, this);
}
RouteGenerated.prototype.name = 'RouteGenerated';
RouteGenerated.prototype.prepare = function prepare(match){
	if(typeof match==='string') match = this.routes.resolveURI(match);
	var body = this.generateBody(match.uri, match.data);
	if(body){
		return Promise.resolve(new ResourceGenerated(this, match, body));
	}else{
		return Promise.resolve();
	}
}
RouteGenerated.prototype.listing = function listing(match){
	if(this.list){
		return Promise.resolve(this.list);
	}else{
		return Promise.reject('RouteGenerated#listing: Not implemented');
	}
}
RouteGenerated.prototype.watch = function listing(cb){
	this.listing().then(function(list){
		list.forEach(function(item){
			cb(item);
		});
	});
}

inherits(ResourceGenerated, Resource);
function ResourceGenerated(route, match, body){
	if(!route.contentType) throw new Error('Expected route.contentType');
	this.route = route;
	this.uri = match.uri;
	this.params = match.data;
	this.body = body;
}
ResourceGenerated.prototype.render = function(req, res, matchRoute, euri, queryMap, options){
	var stream = new PassThrough;
	var contentType = this.route.contentType || 'application/octet-stream';
	stream.setHeader('Content-Type', contentType);
	stream.end(this.body);
	return stream;
}
