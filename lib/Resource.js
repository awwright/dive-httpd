"use strict";

var inherits = require('util').inherits;

var PassThrough = require('http-transform').PassThrough;
var Route = require('./Route.js').Route;

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
				throw new Error('Expected opts.match.uri to be a string');
			}
			this.match = opts.match;
			this.uri = opts.match.uri;
			this.uriTemplate = opts.match.uriTemplate;
			// Support two forms for compatibility
			this.params = opts.match.params || opts.match.data;
		}else if(opts.uri){
			if(typeof opts.uri !== 'string'){
				throw new Error('Expected opts.uri to be a string');
			}
			this.uri = opts.uri;
		}
		if(opts.methods !== undefined){
			if(Array.isArray(opts.methods) || opts.methods===null){
				this.methods = opts.methods;
			}else{
				throw new Error('Expected opts.methods to be array or null');
			}
		}
		if(opts.contentType){
			if(typeof opts.contentType !== 'string'){
				throw new Error('Expected opts.contentType to be a string');
			}
			this.contentType = opts.contentType;
		}else if(route.contentType){
			this.contentType = route.contentType;
		}
		if(opts.inner){
			if(!(opts.inner instanceof Resource)){
				throw new Error('Expected opts.inner to be a Resource');
			}
			this.inner = opts.inner;
		}
		if(opts.render){
			if(typeof opts.render !== 'function'){
				throw new Error('Expected opts.render to be a function');
			}
			this.render = opts.render;
		}
	}
	if(data && typeof data==='object'){
		for(var k in data){
			if(Object.hasOwnProperty.call(this, k)) throw new Error('Property `'+k+'` already defined');
			this[k] = data[k];
		}
	}
}

// Generate a ReadableStream of the resource
Resource.prototype.render = function render(req){
	if(this.route.render) return this.route.render(this, req);
	throw new Error(this.constructor.name + '#render: unimplemented');
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

// Modify this resource (according to uploaded instructions)
Resource.prototype.trace = function trace(req){
	if(this.route.trace) return this.route.trace(this, req);
	return new TraceResource(this).render(req);
};

Resource.prototype.end = function end(){
};

// A RequestPayloadResource is the payload that a client attached to a request.
// It does not (usually) have a URI, nor a route.
exports.RequestPayloadResource = RequestPayloadResource;
inherits(RequestPayloadResource, Resource);
function RequestPayloadResource(render, opts, data){
	if(!(this instanceof RequestPayloadResource)) throw new Error('RequestPayloadResource: constructor only');
	this.render = render;
	Resource.call(this, RequestPayloadResource.Route, opts, data);
}
RequestPayloadResource.Route = new Route;

// Generates a response of the request headers
inherits(TraceResource, Resource);
module.exports.TraceResource = TraceResource;
function TraceResource(){
	if(!(this instanceof TraceResource)) return new TraceResource();
}

TraceResource.prototype.contentType = 'message/http';

TraceResource.prototype.render = function render(req){
	// this.target might have a URI Template expression. Substitute route.variables into this.
	var out = new PassThrough;
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
