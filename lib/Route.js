"use strict";

const { inherits } = require('util');
const TemplateRouter = require('uri-template-router');
const assert = require('./assert.js');
const { ResponsePassThrough } = require('http-transform');
const { compareHTTPDateSince } = require('./http-date.js');
const { errors } = require('./Error.js');
const { handlers } = require('./Method.js');

module.exports.Route = Route;
//inherits(Route, TemplateRouter.Route);
function Route(opts){
	if(!(this instanceof Route)) return new Route(opts);
	if(opts && typeof opts=='object'){
		if(typeof opts.uriTemplate=='string') this.uriTemplate = opts.uriTemplate;
		else if(opts.uriTemplate instanceof TemplateRouter.Route) this.uriRoute = opts.uriTemplate;
		else if(opts.uriTemplate) throw new Error('options.uriTemplate must be a string or Route');

		if(typeof opts.uriRoute=='object') this.uriRoute = opts.uriRoute;
		else if(opts.uriRoute) throw new Error('options.uriRoute must be an object');

		if(typeof opts.contentType=='string') this.contentType = opts.contentType;
		else if(opts.contentType) throw new Error('options.contentType must be a string');

		if(typeof opts.name=='string') this.name = opts.name;
		else if(opts.name) throw new Error('options.name must be a string');

		if(typeof opts.prepare=='function') this.prepare = opts.prepare;
		else if(opts.prepare) throw new Error('options.prepare must be a function');

		if(typeof opts.prepare_match=='function') this.prepare_match = opts.prepare_match;
		else if(opts.prepare_match) throw new Error('options.prepare_match must be a function');

		if(typeof opts.innerRoute=='object' && opts.innerRoute instanceof Route) this.innerRoute = opts.innerRoute;
		else if(opts.innerRoute) throw new Error('options.innerRoute must be a Route');

		if(typeof opts.allocate=='function') this.allocate = opts.allocate;
		else if(opts.allocate) throw new Error('options.allocate must be a function');

		if(typeof opts.allocateMatch=='function') this.allocateMatch = opts.allocateMatch;
		else if(opts.allocateMatch) throw new Error('options.allocateMatch must be a function');

		if(typeof opts.listing=='function') this.listing = opts.listing;
		else if(opts.listing) throw new Error('options.listing must be a function');

		if(typeof opts.store=='function') this.store = opts.store;
		else if(opts.store) throw new Error('options.store must be a function');

		if(typeof opts.error=='function') this.error = opts.error;
		else if(opts.error) throw new Error('options.error must be a function');

		if(typeof opts.watch=='function') this.watch = opts.watch;
		else if(opts.watch) throw new Error('options.watch must be a function');

		if(typeof opts.render=='function') this.render = opts.render;
		else if(opts.render) throw new Error('options.render must be a function');

	}
	if(typeof this.name!=='string') this.name = this.constructor.name.toString();
	this.pipeline = [];

	if(typeof this.uriTemplate==='string' && !this.uriRoute){
		this.uriRoute = new TemplateRouter.Route(this.uriTemplate);
	}
	if(this.uriRoute && !this.uriTemplate){
		this.uriTemplate = this.uriRoute.uriTemplate;
	}

	// This sort of lets you override some of the method behaviors specified by HTTP,
	// This is extremely shady at best.
	// Or better yet, define new ones.
	if(this.methodHandlers === undefined){
		this.methodHandlers = {};
		for (const k in handlers){
			this.methodHandlers[k] = handlers[k];
		}
	}
}

Route.prototype.Resource = Resource;

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepare = function prepare(uri){
	const route = this;
	const match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return this.prepare_match(match).then(function(data){
		if(data===true) return new route.Resource(route, {match});
		else if(data===false) return;
		else if(data && !(data instanceof Resource)) return new route.Resource(route, {match}, data);
		return data;
	});
};

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Route.prototype.prepare_match = function prepare_match(uri){
	throw new Error(this.name + '#prepare_match: unimplemented');
};
// The `abstract` flag signals that this function will definitely raise a 500 error if we called it, without having to call it.
Route.prototype.prepare_match.abstract = true;

// Resolve to a Resource object if something can be stored at the given URI, even if it doesn't already exist
// Usually only called for a PUT/PATCH request if a previous prepare call yielded no result
Route.prototype.allocate = function allocate(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return this.allocate_match(match);
};

Route.prototype.allocate_match = function allocate_match(match){
	return Promise.resolve();
};

// Utility function to parse a plain URI into component parts
Route.prototype.matchUri = function matchUri(uri){
	if(typeof uri==='object'){
		if(uri.uri && uri.uriTemplate){
			return uri;
		}else if(Object.getPrototypeOf(uri)===Object.prototype || Object.getPrototypeOf(uri)===null){
			const route = this.uriRoute;
			if(!this.uriTemplateRouter){
				this.uriTemplateRouter = new TemplateRouter.Router();
				this.uriTemplateRouter.addTemplate(this.uriRoute);
			}
			const str = route.toString(uri);
			return new TemplateRouter.Result(this.uriTemplateRouter, str, {}, [], [new TemplateRouter.FinalMatch(route)]);
		}else{
			throw new Error('Expected TemplateRouter.Result, object, or string');
		}
	}
	if(typeof uri==='string'){
		// TODO change this to use a Route() object without the Router
		// - uriTemplate is the string URI Template in question
		// - uriTemplateRouter is an instance of Router that resolves only the uriTemplate
		if(!this.uriTemplateRouter){
			this.uriTemplateRouter = new TemplateRouter.Router();
			this.uriTemplateRouter.addTemplate(this.uriTemplate);
		}
		return this.uriTemplateRouter.resolveURI(uri);
	}
};

// Utility function to parse a plain URI into component parts
Route.prototype.generateUri = function generateUri(data){
	if(typeof data!=='object'){
		throw new Error('Expected object `data`');
	}
	if(!this.uriTemplateRouter){
		this.uriTemplateRouter = new TemplateRouter.Router();
		this.uriTemplateRouter.addTemplate(this.uriTemplate);
	}
	return this.uriTemplateRouter.routes[0].gen(data);
};

// Call the provided function whenever a resource in the set changes
Route.prototype.watch = function watch(cb){
	return Promise.reject(new Error(this.name + '#watch unimplemented'));
};
Route.prototype.watch.abstract = true;

// List all the URIs accessible through this route
Route.prototype.listing = function listing(){
	return Promise.reject(new Error(this.name + '#listing unimplemented'));
};
Route.prototype.listing.abstract = true;

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
Route.prototype.store = function store(uri, request){
	return Promise.reject();
};

// Generate a notFound response for this route
// Fail to have a higher-level route handle
Route.prototype.error = null;

Object.defineProperty(Route.prototype, 'routerURITemplate', {
	get: function(){ return this.uriTemplate; },
	set: function(v){ this.uriTemplate = v; },
});

// Resource definition

// A Resource is an instance representing a confirmation that the requested resource exists,
// and some data about it, but not necessarily all of the data
module.exports.Resource = Resource;
function Resource(route, opts, data){
	if(!(this instanceof Resource)) throw new Error('Resource: constructor only');
	if(!(route instanceof Route)) throw new Error('Expected Route `route`');
	this.route = route;
	if(opts && typeof opts=='object'){
		// this.opts = opts;
		if(opts.match){
			if(typeof opts.match.uri !== 'string'){
				throw new Error('options.match.uri must be a string');
			}
			if(typeof opts.match.uriTemplate !== 'string'){
				throw new Error('options.match.uriTemplate must be a string');
			}
			this.match = opts.match;
			this.uri = opts.match.uri;
			this.uriTemplate = opts.match.uriTemplate;
			this.params = opts.match.params;
		}else if(opts.uri){
			if(typeof opts.uri !== 'string'){
				throw new Error('options.uri must be a string');
			}
			this.uri = opts.uri;
		}
		if(opts.methods !== undefined){
			if(Array.isArray(opts.methods) || opts.methods===null){
				this.methods = opts.methods;
			}else{
				throw new Error('Optional argument options.methods must be array or null');
			}
		}else if(route.methods){
			this.methods = route.methods;
		}
		if(opts.contentType){
			if(typeof opts.contentType !== 'string'){
				throw new Error('options.contentType must be a string');
			}
			this.contentType = opts.contentType;
		}else if(route.contentType){
			this.contentType = route.contentType;
		}
		if(opts.inner){
			if(!(opts.inner instanceof Resource)){
				throw new Error('options.inner must be a Resource');
			}
			this.inner = opts.inner;
		}
		if(opts.render){
			if(typeof opts.render !== 'function'){
				throw new Error('options.render must be a function');
			}
			this.render = opts.render;
		}
		if(opts.error){
			if(typeof opts.error !== 'function'){
				throw new Error('options.error must be a function');
			}
			this.error = opts.error;
		}
	}
	if(data && typeof data==='object'){
		for(var k in data){
			if(Object.hasOwnProperty.call(this, k)) throw new Error('Property `'+k+'` already defined');
			this[k] = data[k];
		}
	}
}

Resource.prototype.handle = function handle(req){
	const res = new ResponsePassThrough;
	const resource = this;
	function emitError(err){
		// First call this resource's error handler if it exists
		if(!resource.error){
			// If it doesn't exist, just pass the error up
			throw err;
		}
		resource.error(req.uri, err).then(function(errRsc){
			if(errRsc){
				errRsc.render(req).pipeMessage(res);
			}else{
				if(res.readableSide.listenerCount('error')) res.destroy(err);
				else throw err;
			}
		}).catch(function(err){
			// There was an error while trying to create the error resource
			// How embarrassing
			if(res.readableSide.listenerCount('error')) res.destroy(err);
			else throw err;
		});
		return res.clientReadableSide;
	}
	if(req.method==='TRACE'){
		// TRACE in the case (3/3) that the resource exists
		if(resource.trace){
			return resource.trace(req);
		}
		return emitError(new errors.NotImplemented({method:'TRACE'}));
	}
	if(resource.methods && resource.methods.indexOf(req.method) === -1){
		return emitError(new errors.MethodNotAllowed({uri:req.uri, method:req.method}));
	}
	// TODO figure out if this Resource is the origin server or not
	if(req.headers['if-match'] && resource.ETag){
		// TODO handle multiple If-Match items
		if(req.headers['if-match']==='*'){
			// TODO do send this if the resource is not persisted yet
			//return preconditionFail();
		}else if(req.headers['if-match'] !== '"'+resource.ETag+'"'){
			return preconditionFail();
		}
	}else if(req.headers['if-unmodified-since'] && resource.lastModified){
		if(compareHTTPDateSince(req.headers['if-unmodified-since'], resource.lastModified) === true){
			return preconditionFail();
		}
	}
	if(req.headers['if-none-match'] && resource.ETag){
		// TODO handle multiple If-Match items
		if(req.headers['if-none-match'] === '*'){
			// TODO don't send this if the resource is not persisted yet
			return preconditionFail(res);
		}else if(req.headers['if-none-match'] === '"'+resource.ETag+'"'){
			return preconditionFail(res);
		}
	}else if(req.headers['if-modified-since'] && resource.lastModified){
		if(compareHTTPDateSince(req.headers['if-modified-since'], resource.lastModified) === false){
			return preconditionFail(res);
		}
	}
	function preconditionFail(){
		// TODO ensure these headers remain the same:
		// Cache-Control, Content-Location, Date, ETag, Expires, Vary
		if(req.method==='GET' || req.method==='HEAD'){
			res.statusCode = 304; // Not Modified
			resource.preconditionFail(res);
		}else{
			res.statusCode = 412; // Precondition Failed
			resource.preconditionFail(res);
		}
		return res.clientReadableSide;
	}
	var stream;

	const methodHandler = this.route.methodHandlers[req.method];
	if(!methodHandler || !methodHandler.allowed(resource)){
		// Emit 405 Method Not Allowed
		return emitError(new errors.MethodNotAllowed({uri:req.uri, method:req.method}));
	}
	stream = methodHandler.renderStream(resource, req);

	if(!stream){
		process.nextTick(function(){
			res.destroy(new Error('Resource did not return a response stream'));
		});
		return;
	}
	if(stream.headersSent===false) stream.once('headers', waitHeaders);
	else waitHeaders();
	function waitHeaders(){
		if(req.method==='GET' || req.method==='HEAD'){
			// At this point, headers from `stream` are final,	
			// and have been written to `res` for further adjustment
			if(resource.contentType){
				res.setHeader('Content-Type', resource.contentType);
			}
			if(resource.lastModified){
				res.setHeader('Last-Modified', resource.lastModified.toUTCString());
			}
			if(resource.ETag){
				res.setHeader('ETag', '"'+resource.ETag.toString()+'"');
			}
		}
	}
	stream.on('error', function(err){
		res.destroy(err);
	});
	stream.pipeMessage(res);
	return res.clientReadableSide;
};

// Generate a ReadableStream for a GET request
Resource.prototype.render = function render(req){
	if(this.route.render){
		const res = this.route.render(this, req);
		assert.isReadableResponse(res, `${this.route.name}#render did not return a Response`);
		return res;
	}
	throw new Error(this.constructor.name + '#render: unimplemented (route: '+this.route.constructor.name+')');
};

Resource.prototype.error = function error(uri, err){
	if(this.route.error){
		return this.route.error(uri, err);
	}else{
		return Promise.resolve();
	}
};

Resource.prototype.methods = ['GET', 'HEAD'];

// Accept data for evaluation by this resource
Resource.prototype.post = function post(req){
	if(this.route.post) return this.route.post(this, req);
	throw new Error(this.constructor.name + '#post: unimplemented');
};

// Delete this resource from the underlying data store
Resource.prototype.del = function del(req){
	if(this.route.del) return this.route.del(this, req);
	throw new Error(this.constructor.name + '#del: unimplemented');
};

// Modify this resource (according to uploaded instructions)
Resource.prototype.patch = function patch(req){
	if(this.route.patch) return this.route.patch(this, req);
	throw new Error(this.constructor.name + '#patch: unimplemented');
};

// Return the request headers as the response body
Resource.prototype.trace = function trace(req){
	if(this.route.trace) return this.route.trace(this, req);
	return new TraceResource(this).render(req);
};

// Handle some other HTTP method
Resource.prototype.custom = function custom(req){
	if(this.route.custom) return this.route.custom(this, req);
	throw new Error(this.constructor.name + '#custom: unimplemented');
};

// Handle some other HTTP method
Resource.prototype.preconditionFail = function preconditionFail(res){
	return res.end();
};


// Generates a response of the request headers
inherits(TraceResource, Resource);
module.exports.TraceResource = TraceResource;
function TraceResource(){
	if(!(this instanceof TraceResource)) return new TraceResource();
}

TraceResource.prototype.contentType = 'message/http';

TraceResource.prototype.render = function render(req){
	// this.target might have a URI Template expression. Substitute route.variables into this.
	var out = new ResponsePassThrough;
	if(req.headers['origin'] && (req.headers['cookie'] || req.headers['authorization'])){
		out.statusCode = 400;
		out.setHeader('Content-Type', 'text/plain');
		out.setHeader('Vary', '*');
		const buf = Buffer.from('400 Client Error: Cowardly refusing to fill CORS request with ambient authority\r\n');
		out.setHeader('Content-Length', buf.length.toString());
		out.end(buf);
	}else{
		out.setHeader('Content-Type', this.contentType);
		out.setHeader('Vary', '*');
		var body = req.method + ' ' + (req.uri || req.url) + ' HTTP/' + req.httpVersion + '\r\n';
		for(var i=0; i<req.rawHeaders.length; i+=2){
			body += req.rawHeaders[i] + ': ' + req.rawHeaders[i+1] + '\r\n';
		}
		body += '\r\n';
		const buf = Buffer.from(body);
		out.setHeader('Content-Length', buf.length.toString());
		out.end(buf);
	}
	return out;
};
