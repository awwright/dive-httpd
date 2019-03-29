

var inherits = require('util').inherits;

var accepts = require('accepts');
var URITemplate = require('uri-template-router').Route;
var URITemplateRouter = require('uri-template-router').Router;

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;

module.exports.Negotiate = Negotiate;
inherits(Negotiate, Route);
function Negotiate(uriTemplate, routes){
	var self = this;
	if(!(this instanceof Negotiate)) return new Negotiate(uriTemplate, routes);
	if(!Array.isArray(routes)) throw new Error('Expected arguments[1] `routes` to be an Array');
	Route.call(this);
	this.routerURITemplate = uriTemplate;
	routes.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
		if(typeof item.routerURITemplate !== 'string')  throw new Error('Expected `routes[i].routerURITemplate` to be a string');
	});
	this.routes = routes;
	this.routesParsed = routes.map(function(item){
		return new URITemplate(item.routerURITemplate);
	});
	this.routeParsed = new URITemplateRouter();
	this.routeParsed.addTemplate(this.routerURITemplate, {}, this);
}
Negotiate.prototype.name = 'Negotiate';
Negotiate.prototype.prepare = function prepare(match, euri, queryMap){
	var self = this;
	if(typeof match==='string'){
		match = this.routeParsed.resolveURI(match);
		if(!match) return Promise.resolve();
	}
	var mediaTypeList = new Array;
	var mediaTypeMap = new Map;
	self.routes.forEach(function(r){
		if(r.contentType && !mediaTypeMap.has(r.contentType)){
			mediaTypeMap.set(r.contentType, r);
			mediaTypeList.push(r.contentType);
		}
	});
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	return Promise.all(self.routes.map(function(route, i){
		// Map the outer URI to the inner URI
		var cousin = self.routesParsed[i];
		return route.prepare(match.rewrite(cousin), euri, queryMap);
	})).then(function(resolved){
		if(resolved.some(function(v){ return !!v; })){
			return Promise.resolve(new NegotiateResource(self, resolved));
		}else{
			return Promise.resolve();
		}
	});
}
Negotiate.prototype.listing = function listing(){
	return Promise.all(this.routes.map(function(route){
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
Negotiate.prototype.watch = function watch(fn){
	this.routes.forEach(function(i){
		i.watch(fn);
	});
}


inherits(NegotiateResource, Resource);
module.exports.NegotiateResource = NegotiateResource;
function NegotiateResource(route, resources){
	// if(!(this instanceof NegotiateResource)) return new NegotiateResource(route, resources);
	if(!(route instanceof Negotiate)) throw new Error('Expected `route` to be instnaceof Negotiate');
	if(!Array.isArray(resources)) throw new Error('Expected `resources` to be an array');
	this.route = route;
	this.resources = resources;
}
NegotiateResource.prototype.render = function render(req){
	// Pick the best match based on the request, then call that resource's render
	var types = {};
	var typeList = [];
	this.resources.forEach(function(v){
		var ct = v && (v.contentType || v.route.contentType);
		if(ct){
			types[ct] = v;
			typeList.push(ct);
		}
	});
	var selectedType = accepts(req).type(typeList);
	var resourceResource = types[selectedType];
	if(!resourceResource) throw new Error('Assertion error: Unknown resource');
	return resourceResource.render.apply(resourceResource, arguments);
};
