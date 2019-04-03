
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;
var URITemplate = require('uri-template-router').Route;
var URITemplateRouter = require('uri-template-router').Router;

module.exports.RoutePipeline = RoutePipeline;

inherits(RoutePipeline, Route);

function RoutePipeline(opts, t2){
	if(!(this instanceof RoutePipeline)) return new RoutePipeline(opts, t2);
	if(t2){
		// If there's two arguments then the outer template is just the same as the inner one
		this.routerURITemplate = t2.uriTemplate || opts.routerURITemplate;
		this.contentType = t2.contentType;
		this.outboundTransform = t2;
		this.inboundTransform = null; // for converting PUT requests
		this.innerRoute = opts;
	}else{
		this.routerURITemplate = opts.uriTemplate || opts.routerURITemplate;
		this.contentType = opts.contentType;
		this.outboundTransform = opts.outboundTransform;
		this.inboundTransform = opts.inboundTransform; // for converting PUT requests
		this.innerRoute = opts.innerRoute;
	}
	var target = this.outboundTransform;
	if(!(this.innerRoute instanceof Route)) throw new Error('Expected `innerRoute` to be instanceof Route');
	if(!this.innerRoute.name) throw new Error('Missing name');
	if(!this.innerRoute.routerURITemplate) throw new Error('Expected `innerRoute` to have a routerURITemplate');
	if(Array.isArray(target)){
		this.name = 'Pipeline('+this.innerRoute.name+','+target.map(v=>v.name).join(',')+')';
		// pipeline.contentType = target[target.length-1].contentType;
	}else{
		this.name = 'Pipeline('+this.innerRoute.name+','+target.name+')';
		// pipeline.contentType = target.contentType;
	}
	this.routeParsed = new URITemplateRouter();
	this.routeParsed.addTemplate(this.routerURITemplate, {}, this);
	this.innerRouteTemplate = new URITemplate(this.innerRoute.routerURITemplate);
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
RoutePipeline.prototype.prepare = function prepare(match){
	if(typeof match==='string'){
		match = this.routeParsed.resolveURI(match);
		if(!match) return Promise.resolve();
	}
	var innerRoute = this.innerRoute;
	var contentType = this.contentType;
	var target = this.outboundTransform;
	var innerMatch = match.rewrite(this.innerRouteTemplate);
	return innerRoute.prepare(innerMatch).then(function(resource){
		if(resource===undefined) return Promise.resolve();
		const res = Object.create(resource);
		res.super = resource;
		res.uri = match.uri;
		if(contentType) res.contentType = contentType;
		res.render = function render(){
			if(Array.isArray(target)){
				return target.reduce(function(stream, transform){
					var instance = transform(resource);
					stream.pipe(instance);
					return instance;
				}, resource.render.apply(resource, arguments));
			}else{
				return resource.render.apply(this, arguments).pipe(target(resource));
			}
		}
		return Promise.resolve(res);
	});
}

// Call the provided function whenever a resource in the set changes
RoutePipeline.prototype.watch = function watch(cb){
	// TODO: might need to do some URI or other mapping
	this.innerRoute.watch(cb);
}

// List all the URIs accessible through this route
RoutePipeline.prototype.listing = function listing(){
	return this.innerRoute.listing();
}

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
RoutePipeline.prototype.store = function store(uri, request){
	return Promise.reject();
}

// Generate a notFound response for this route
// Fail to have a higher-level route handle
RoutePipeline.prototype.error = function error(uri, request){
	return Promise.reject();
}

RoutePipeline.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
}
