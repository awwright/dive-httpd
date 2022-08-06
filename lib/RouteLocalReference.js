"use strict";

var TemplateRouter = require('uri-template-router');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

// RouteLocalReference: Rewrite a URI or change its variables

inherits(RouteLocalReference, Route);
module.exports.RouteLocalReference = RouteLocalReference;
function RouteLocalReference(uriTemplate, innerRoute, innerTemplate){
	if(!(this instanceof RouteLocalReference)) return new RouteLocalReference(uriTemplate, innerRoute, innerTemplate);
	if(typeof innerRoute !== 'object') throw new Error('Expected arguments[1] `router` to be an object');
	if(!(innerRoute instanceof Route)) throw new Error('Expected arguments[1] `router` to be instanceof Router');
	Route.call(this, {uriTemplate, innerRoute});
	this.innerTemplate = innerTemplate;
	this.innerTemplateRoute = new TemplateRouter.Route(innerTemplate);
	this.label = 'RouteLocalReference('+innerTemplate+')';
	this.name = this.label + ' | ' + this.innerRoute.name;
}

RouteLocalReference.prototype.label = 'RouteLocalReference';
RouteLocalReference.prototype.name = 'RouteLocalReference';

RouteLocalReference.prototype.prepare = function prepare(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	var inboundURI = this.innerTemplateRoute ? match.rewrite(this.innerTemplateRoute) : match;
	// console.log(uri.uri + ' -> '+inboundURI.uri);
	return this.innerRoute.prepare(inboundURI.uri);
};

RouteLocalReference.prototype.listing = function listing(){
	return this.innerRoute.listing();
};

RouteLocalReference.prototype.listDependents = function listDependents(){
	return [ this.innerRoute ];
};
