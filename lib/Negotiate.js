

var inherits = require('util').inherits;

var accepts = require('accepts');
var ServerResponseTransform = require('http-transform').ServerResponseTransform;
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
	this.label = 'Negotiate('+routes.length+')'
	this.name = this.label + ' [' + routes.map(function(v){ return v.name; }).join(' , ') + ']'
}
Negotiate.prototype.label = 'Negotiate';
Negotiate.prototype.prepare = function prepare(uri, euri, queryMap){
	var self = this;
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
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
		var list_s = [];
		routes.forEach(function(listing){
			listing.forEach(function(v){
				// FIXME the intention here is to not have values with the same data in `list`
				// A non-deterministic JSON.stringify could thwart this
				var vs = JSON.stringify(v);
				if(list_s.indexOf(vs)<0){
					list_s.push(vs);
					list.push(v);
				}
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
Negotiate.prototype.listDependents = function listDependents(){
	return this.routes.slice();
}


inherits(NegotiateResource, Resource);
module.exports.NegotiateResource = NegotiateResource;
function NegotiateResource(route, resources){
	// if(!(this instanceof NegotiateResource)) return new NegotiateResource(route, resources);
	if(!(route instanceof Negotiate)) throw new Error('Expected `route` to be instnaceof Negotiate');
	if(!Array.isArray(resources)) throw new Error('Expected `resources` to be an array');
	this.route = route;
	this.resources = resources;
	// This resource doesn't provide `uri` or `contentType` since it's variable depending on the request details
	// The lack of these properties also prevents a Negotiate from being selected by another Negotiate
}
NegotiateResource.prototype.render = function render(req){
	if(typeof req!=='object') throw new Error('Expected `req`');
	if(typeof req.headers!=='object') throw new Error('Expected `req.headers`');
	// Pick the best match based on the request, then call that resource's render
	var types = {};
	var typeList = [];
	this.resources.forEach(function(v){
		if(!v) return;
		var ct = v && (v.contentType || v.route.contentType);
		if(ct){
			types[ct] = v;
			typeList.push(ct);
		}else{
			throw new Error('Resource has no exposed contentType');
		}
	});
	var selectedType = accepts(req).type(typeList);
	var selectedResource = types[selectedType];
	if(!selectedResource) throw new Error('Assertion error: Unknown resource');
	return selectedResource.render.apply(selectedResource, arguments).pipe(new ServerResponseTransform({
		transformHead: function _transformHead(headers){
			headers.setHeader('Content-Location', selectedResource.uri);
			headers.setHeader('Vary', 'Accept');
			return headers;
		},
		transform: function _transform(data, encoding, callback){
			callback(null, data);
		},
	}));
};
