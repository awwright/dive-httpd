
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

module.exports.RoutePipeline = RoutePipeline;

inherits(RoutePipeline, Route);

function RoutePipeline(opts, t2){
	if(!(this instanceof RoutePipeline)) return new RoutePipeline(opts, t2);
	if(t2){
		this.routerURITemplate = t2.routerURITemplate;
		this.contentType = t2.contentType;
		this.outboundTransform = t2;
		this.inboundTransform = null; // for converting PUT requests
		this.innerRoute = opts;
	}else{
		this.routerURITemplate = opts.routerURITemplate;
		this.contentType = opts.contentType;
		this.outboundTransform = opts.outboundTransform;
		this.inboundTransform = opts.inboundTransform; // for converting PUT requests
		this.innerRoute = opts.innerRoute;
	}
	var target = this.outboundTransform;
	if(!(this.innerRoute instanceof Route)) throw new Error('Expected `innerRoute` to be instanceof Route');
	if(!this.innerRoute.name) throw new Error('Missing name');
	if(Array.isArray(target)){
		this.name = 'Pipeline('+this.innerRoute.name+','+target.map(v=>v.name).join(',')+')';
		// pipeline.contentType = target[target.length-1].contentType;
	}else{
		this.name = 'Pipeline('+this.innerRoute.name+','+target.name+')';
		// pipeline.contentType = target.contentType;
	}
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
RoutePipeline.prototype.prepare = function prepare(result){
	var pipeline = this;
	var innerRoute = pipeline.innerRoute;
	var target = this.outboundTransform;
	return innerRoute.prepare.apply(innerRoute, arguments).then(function(resource){
		if(resource===undefined) return Promise.resolve();
		const res = Object.create(resource);
		res.super = resource;
		res.render = function render(){
			if(Array.isArray(target)){
				return target.reduce(function(stream, transform){
					var instance = transform(resource);
					stream.pipe(instance);
					return instance;
				}, resource.render.apply(resource, arguments));
			}else{
				return resource.render.apply(this, arguments).pipe(target());
			}
		}
		return Promise.resolve(res);
	});
}

// List all the URIs accessible through this route
RoutePipeline.prototype.listing = function listing(){
	return Promise.fail(new Error(this.constructor.name.toString() + ': unimplemented'));
}

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
RoutePipeline.prototype.store = function store(uri, request){
	return Promise.fail();
}

// Generate a notFound response for this route
// Fail to have a higher-level route handle
RoutePipeline.prototype.error = function error(uri, request){
	return Promise.fail();
}
