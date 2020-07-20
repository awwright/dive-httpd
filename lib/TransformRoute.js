"use strict";

const inherits = require('util').inherits;
const assert = require('./assert.js');

const Route = require('./Route.js').Route;
const Resource = require('./Route.js').Resource;
const { ResponsePassThrough } = require('http-transform');

// A Router which defaults to passing calls through to an `innerRoute`
module.exports.TransformRoute = TransformRoute;
inherits(TransformRoute, Route);
function TransformRoute(opts, innerRoute){
	Route.call(this, opts);
	if(innerRoute && this.innerRoute===undefined) this.innerRoute = innerRoute;
	if(typeof this.innerRoute!=='object' || !(this.innerRoute instanceof Route)){
		throw new Error('Required property TransformRoute#innerRoute must be a Route');
	}
	if(opts && typeof opts.render_transform === 'function'){
		this.render_transform = opts.render_transform;
	}else if(opts && opts.render_transform){
		throw new Error('options.render_transform must be a function');
	}
	if(this.uriTemplate===undefined) this.uriTemplate = this.innerRoute.uriTemplate;
	if(this.contentType===undefined) this.contentType = this.innerRoute.contentType;
}

TransformRoute.prototype.name = 'TransformRoute';
TransformRoute.prototype.label = 'TransformRoute';

TransformRoute.prototype.prepare_match = function prepare_match(uri){
	const route = this;
	if(!this.innerRoute){
		throw new Error(this.constructor.name.toString() + '#prepare_match: unimplemented');
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

TransformRoute.prototype.render = function render(resource, req){
	if(!this.render_transform){
		throw new Error(this.constructor.name.toString() + '#render: unimplemented');
	}
	const res = new ResponsePassThrough;
	const input = resource.inner.render(req);
	assert.isReadableRequest(input);
	this.render_transform(resource, req, input, res.writableSide).catch(function(error){
		res.destroy(error);
	});
	return res.readableSide;
};

TransformRoute.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
};
