"use strict";

var inherits = require('util').inherits;

var Route = require('./Route.js').Route;

// Try a series of alternatives, use the first successful dereference
module.exports.First = First;
inherits(First, Route);
function First(uriTemplate, list){
	if(!(this instanceof First)) return new First(uriTemplate, list);
	if(Array.isArray(uriTemplate) && list===undefined){
		// Rewrite case for skipped uriTemplate
		list = uriTemplate;
		uriTemplate = undefined;
	}
	this.uriTemplate = uriTemplate;
	if(!Array.isArray(list)) throw new Error('Expected arguments[0] `list` to be an Array');
	list.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
	});
	this.list = list;
	this.label = 'First(' + list.length + ')';
	this.name = this.label + ' [' + list.map(function(v){ return v.name; }).join(' , ') + ']';
	Route.call(this);
}
First.prototype.label = 'First';
First.prototype.listing = function listing(){
	return Promise.all(this.list.map(function(route){
		return route.listing();
	})).then(function(routes){
		var list = [];
		routes.forEach(function(listing){
			listing.forEach(function(v){
				if(list.indexOf(v)<0) list.push(v);
			});
		});
		return Promise.resolve(list);
	});
};
First.prototype.watch = function watch(fn){
	return Promise.all(this.list.map(function(r){
		return r.watch(fn);
	}));
};
First.prototype.prepare = async function prepare(uri){
	// console.error('First#prepare', uri);
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	const list = this.list;
	for(var i=0; i<list.length; i++){
		const handler = list[i];
		if(!handler) continue;
		const resource = await handler.prepare(uri);
		if(resource) return resource;
	}
};

First.prototype.listDependents = function listDependents(){
	return this.list.slice();
};
