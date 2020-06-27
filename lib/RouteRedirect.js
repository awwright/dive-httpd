"use strict";

var inherits = require('util').inherits;

var Route = require('./Route.js').Route;
var Resource = require('./Route.js').Resource;
var PassThrough = require('http-transform').PassThrough;
var URITemplateRoute = require('uri-template-router').Route;

// RouteRedirect: resource has a fixed, static body programmatically related to its URI.
// Expect this to be used mostly for testing and example purposes.
exports.RouteRedirect = RouteRedirect;
inherits(RouteRedirect, Route);
function RouteRedirect(uriTemplate, redirectLocation, options){
	if(!(this instanceof RouteRedirect)) return new RouteRedirect(uriTemplate, options);
	this.uriTemplate = uriTemplate;
	this.redirectLocation = redirectLocation;
	this.redirectLocationRoute = new URITemplateRoute(redirectLocation);
	if(typeof options==='object'){
		if(options.label) this.label = options.label;
		if(options.statusCode) this.statusCode = options.statusCode;
		if(options.error) this.error = options.error;
		this.name = options.name || this.label;
	}
	if(!this.statusCode){
		throw new Error('statusCode required');
	}
}
RouteRedirect.prototype.label = 'RouteRedirect';
RouteRedirect.prototype.prepare = function prepare(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return Promise.resolve(new Resource(this, {match}));
};
RouteRedirect.prototype.render = function render(resource){
	var res = new PassThrough;
	res.statusCode = this.statusCode;
	res.setHeader('Location', resource.match.rewrite(this.redirectLocationRoute).uri);
	res.end();
	return res;
};
RouteRedirect.prototype.listing = function listing(){
	return Promise.resolve([]);
};
RouteRedirect.prototype.watch = function listing(cb){
	this.listing().then(function(list){
		list.forEach(function(item){
			cb(item);
		});
	});
};
RouteRedirect.prototype.listDependents = function listDependents(){
	return [];
};

// 303 See Other
// See also: 202 Accepted
exports.RouteSeeOther = RouteSeeOther;
inherits(RouteSeeOther, RouteRedirect);
function RouteSeeOther(uriTemplate, target, options){
	if(!(this instanceof RouteSeeOther)) return new RouteSeeOther(uriTemplate, target, options);
	RouteRedirect.call(this, uriTemplate, target, options);
}
RouteSeeOther.prototype.label = 'RouteSeeOther';
RouteSeeOther.prototype.statusCode = 303;

// 307 Temporary Redirect
exports.RouteTemporaryRedirect = RouteTemporaryRedirect;
inherits(RouteTemporaryRedirect, RouteRedirect);
function RouteTemporaryRedirect(uriTemplate, target, options){
	if(!(this instanceof RouteTemporaryRedirect)) return new RouteTemporaryRedirect(uriTemplate, target, options);
	RouteRedirect.call(this, uriTemplate, target, options);
}
RouteTemporaryRedirect.prototype.label = 'RouteTemporaryRedirect';
RouteTemporaryRedirect.prototype.statusCode = 307;

// 308 Permanent Redirect
exports.RoutePermanentRedirect = RoutePermanentRedirect;
inherits(RoutePermanentRedirect, RouteRedirect);
function RoutePermanentRedirect(uriTemplate, target, options){
	if(!(this instanceof RoutePermanentRedirect)) return new RoutePermanentRedirect(uriTemplate, target, options);
	RouteRedirect.call(this, uriTemplate, target, options);
}
RoutePermanentRedirect.prototype.label = 'RoutePermanentRedirect';
RoutePermanentRedirect.prototype.statusCode = 308;
