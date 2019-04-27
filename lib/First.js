
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
	this.label = 'First(' + list.length + ')'
	this.name = this.label + ' [' + list.map(function(v){ return v.name; }).join(' , ') + ']'
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
}
First.prototype.watch = function watch(fn){
	var list = [];
	this.list.forEach(function(i){
		i.watch(fn);
	});
	return list;
}
First.prototype.prepare = function prepare(route, euri, queryMap){
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	var list = this.list;
	return testRoute(0);
	function testRoute(route_i){
		var handler = list[route_i];
		if(!handler) return Promise.resolve();
		return handler.prepare(route, euri, queryMap).then(function(stream){
			if(!stream) return testRoute(route_i+1);
			return Promise.resolve(stream);
		}, function(err){
			return testRoute(route_i+1);
		});
	}
}

First.prototype.listDependents = function listDependents(){
	return this.list.slice();
}
