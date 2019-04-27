"use strict";

var inherits = require('util').inherits;

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;
var PassThrough = require('http-transform').PassThrough;

// RouteGenerated: resource has a fixed, static body programmatically related to its URI.
// Expect this to be used mostly for testing and example purposes.
exports.RouteGenerated = RouteGenerated;
inherits(RouteGenerated, Route);
function RouteGenerated(uriTemplate, options){
	if(!(this instanceof RouteGenerated)) return new RouteGenerated(uriTemplate, options);
	this.uriTemplate = uriTemplate;
	if(typeof options==='object'){
		if(options.contentType) this.contentType = options.contentType;
		if(options.generateBody) this.generateBody = options.generateBody;
		if(options.list) this.list = options.list;
		if(options.label) this.label = options.label;
		this.name = options.name || this.label;
	}
}
RouteGenerated.prototype.name = 'RouteGenerated';
RouteGenerated.prototype.label = 'RouteGenerated';
RouteGenerated.prototype.prepare = function prepare(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	var body = this.generateBody(match.uri, match.data);
	if(body){
		return Promise.resolve(new ResourceGenerated(this, match, body));
	}else{
		return Promise.resolve();
	}
}
RouteGenerated.prototype.listing = function listing(){
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
	this.contentType = route.contentType;
	this.params = match.data;
	this.body = body;
}
ResourceGenerated.prototype.render = function(){
	var stream = new PassThrough;
	var contentType = this.route.contentType || 'application/octet-stream';
	stream.setHeader('Content-Type', contentType);
	stream.end(this.body);
	return stream;
}
