"use strict";

const inherits = require('util').inherits;
const assert = require('assert');

const Route = require('./Route.js').Route;
const Resource = require('./Route.js').Resource;

// A Router which defaults to passing calls through to an `innerRoute`
module.exports.TransformRoute = TransformRoute;
inherits(TransformRoute, Route);
function TransformRoute(opts, innerRoute){
	Route.call(this, opts);
	if(innerRoute && this.innerRoute===undefined) this.innerRoute = innerRoute;
	if(typeof this.innerRoute!=='object'){
		throw new Error('Required property TransformRoute#innerRoute is undefined');
	}
	if(this.uriTemplate===undefined) this.uriTemplate = this.innerRoute.uriTemplate;
	if(this.contentType===undefined) this.contentType = this.innerRoute.contentType;
}

TransformRoute.prototype.name = 'TransformRoute';
TransformRoute.prototype.label = 'TransformRoute';

TransformRoute.prototype.prepareMatch = function prepareMatch(uri){
	const route = this;
	if(!this.innerRoute){
		throw new Error(this.constructor.name.toString() + '#prepareMatch: unimplemented');
	}
	const match = this.matchUri(uri);
	if(match){
		return this.innerRoute.prepare(match).then(function(inner){
			if(!inner) return;
			return new Resource(route, {inner, match});
		});
	}else{
		return Promise.resolve();
	}
};

// Call the provided function whenever a resource in the set changes
TransformRoute.prototype.watch = function watch(cb){
	const route = this;
	return this.innerRoute.watch(function(inner, ancestor){
		var match = inner.match.rewrite(route.uriTemplate);
		return void cb(new route.Resource(route, {match, inner}), ancestor);
	});
};

// List all the URIs accessible through this route
TransformRoute.prototype.listing = function listing(){
	const route = this;
	return this.innerRoute.listing().then(function(list){
		return Promise.all(list.map(function(inner){
			var match = inner.match.rewrite(route.uriTemplate);
			return new route.Resource(route, {match, inner});
		}));
	});
};

TransformRoute.prototype.render = function render(req){
	const route = this;
	return this.innerRoute.render(req).then(function(inner){
		assert(inner);
		return new route.Resource(route, {inner});
	});
};

TransformRoute.prototype.renderFromString = function render(resource, req){
	const res = new ResponsePassThrough;
	resource.inner.renderString(req).then(function(upstreamResponse){
		return generateString(resource, upstreamResponse).pipe(res);
	}).catch(function(err){
		res.emit('error', err);
	});
	return res.clientReadableSide;
};
