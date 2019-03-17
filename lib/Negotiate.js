

var inherits = require('util').inherits;

var accepts = require('accepts');

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;

module.exports.Negotiate = Negotiate;
inherits(Negotiate, Route);
function Negotiate(uriTemplate, routes){
	var self = this;
	if(!(this instanceof Negotiate)) return new Negotiate(uriTemplate, routes);
	if(!Array.isArray(routes)) throw new Error('Expected arguments[1] `routes` to be an Array');
	this.routerURITemplate = uriTemplate;
	this.contentTypeMap = new Map;
	routes.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
		if(item.contentType && !self.contentTypeMap.has(item.contentType)){
			self.contentTypeMap.set(item.contentType, item);
		}
	});
	this.routes = routes;
	Route.call(this);
}
Negotiate.prototype.index = function index(routes){
	var routes = [];
	this.routes.forEach(function(i){
		i.index(routes).forEach(function(v){
			if(routes.indexOf(v)<0) routes.push(v);
		});
	});
	return routes;
}
Negotiate.prototype.prepare = function prepare(route, euri, queryMap){
	var self = this;
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
	return Promise.all(self.routes.map(function(handler){
		return handler.prepare(route, euri, queryMap).catch(function(e){
			return Promise.resolve(null);
		});
	})).then(function(resolved){
		// console.log(resolved.map(function(v){ return v ? v.route.contentType : null ; }));
		// console.log('Foo');
		// var m = {};
		// resolved.forEach(function(v){ if(v) m[v.route.contentType] = v; })
		// console.log('Select', euri, m);
		if(resolved.some(function(v){ return !!v; })){
			return Promise.resolve(new NegotiateResource(self, resolved));
		}else{
			return Promise.reject();
		}
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
	this.resources.forEach(function(v){
		if(v){
			types[v.route.contentType] = v;
		}
	});
	var selectedType = accepts(req).type(Object.keys(types));
	var resourceResource = types[selectedType];
	if(!resourceResource) throw new Error('Assertion error: Unknown resource');
	return resourceResource.render.apply(resourceResource, arguments);
};
