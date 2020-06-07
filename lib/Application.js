"use strict";

var Route = require('./Route.js').Route;
var RouteURITemplate = require('./RouteURITemplate.js').RouteURITemplate;
var TraceResource = require('./Resource.js').TraceResource;
var inherits = require('util').inherits;
var compareHTTPDateSince = require('./http-date.js').compareHTTPDateSince;

module.exports.Application = Application;
inherits(Application, Route);
function Application(opts){
	if(!(this instanceof Application)) return new Application(opts);
	if(!opts) opts={};
	this.fixedScheme = opts.fixedScheme;
	this.fixedAuthority = opts.fixedAuthority;
	// If true, Host header is not required,
	// however fixedAuthority or the absolute-form must provide it if missing.
	// This is mostly to make scripting/testing easier.
	// this.relaxedHost = false;
	// Allow an alternate router to be specified, but default to the URI Template router
	this.innerRoute = opts.innerRoute || new RouteURITemplate({routes: opts.routes});
	this.onError = null;
}

Application.prototype.label = 'Application';

Application.prototype.prepare = function prepare(){
	return this.innerRoute.prepare.apply(this.innerRoute, arguments);
};

Application.prototype.allocate = function allocate(){
	return this.innerRoute.allocate.apply(this.innerRoute, arguments);
};

// Application defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
Application.prototype.error = function error(){
	return this.innerRoute.error.apply(this.innerRoute, arguments);
};

Application.prototype.listing = function listing(){
	return this.innerRoute.listing.apply(this.innerRoute, arguments);
};

Application.prototype.addRoute = function addRoute(){
	this.innerRoute.addRoute.apply(this.innerRoute, arguments);
	this.onReady = this.innerRoute.onReady;
};

Application.prototype.listDependents = function listDependents(){
	return [ this.innerRoute ];
};

Application.prototype.handleRequest = function handleRequest(req, res){
	var app = this;

	if(typeof req.uri!=='string'){
		throw new Error('Expected `req.uri` to be a string');
	}
	if(typeof req.headers!=='object'){
		throw new Error('Expected `req.headers` to be an object');
	}

	if(req.headers['max-forwards']==='0'){
		if(req.method==='TRACE'){
			// TRACE in the case (1/3) that the max-forwards is 0,
			// which must be handled by the server directly before it is routed
			res.statusCode = 200;
			new this.TraceResource(this).render(req).pipe(res);
			return;
		}else if(req.method==='OPTIONS'){
			/// TODO query the part that forwards the request, but don't let it forward this particular message
			res.end();
			return;
		}
	}

	return this.initialize().then(function(){
		var prepare = app.prepare(req.uri);
		if(req.method==='PUT' || req.method==='PATCH'){
			// If the method can create a resource, add an additional check to call allocate if necessary
			return prepare.then(function(resourceRequest){
				if(resourceRequest) return resourceRequest;
				return app.allocate(req.uri);
			});
		}
		return prepare;
	}).then(function(resource){
		if(!resource){
			return app.error(req.uri, {statusCode:404}).then(function(errorResource){
				res.statusCode = 404;
				if(!errorResource) errorResource = app.defaultNotFound;
				if(!errorResource){
					// Gotta return something...
					res.setHeader('Content-Type', 'text/plain');
					res.end('500 Internal Server Error occured while looking up a Not Found response\r\n');
					return;
				}
				if(req.method==='TRACE'){
					// TRACE in the case (2/3) that the resource does not exist
					if(errorResource.TraceResource){
						res.statusCode = 200;
						new errorResource.TraceResource(this).render(req).pipe(res);
						return;
					}
					return app.error(req.uri, {statusCode: 501}).then(function(notImplementedResource){
						if(notImplementedResource){
							notImplementedResource.render(req).pipe(res);
						}else{
							// Gotta return something...
							res.setHeader('Content-Type', 'text/plain');
							res.end('501 Not Implemented\r\n');
							return;
						}
					});
				}
				errorResource.render(req).pipe(res);
			}).catch(function fail(err){
				if(!res.headersSent){
					res.statusCode = 500;
					res.setHeader('Content-Type', 'text/plain');
					res.end('500 Server Error occurred while processing a Not Found response\r\n');
				}
				app.emitError(req, err);
			});
		}
		if(req.method==='TRACE'){
			// TRACE in the case (3/3) that the resource exists
			if(resource.TraceResource){
				res.statusCode = 200;
				new resource.TraceResource(this).render(req).pipe(res);
				return;
			}
			return app.error(req.uri, {statusCode: 501}).then(function(notImplementedResource){
				if(notImplementedResource){
					notImplementedResource.render(req).pipe(res);
				}else{
					// Gotta return something...
					res.setHeader('Content-Type', 'text/plain');
					res.end('501 Not Implemented\r\n');
					return;
				}
			});
		}
		var matchRoute = {};
		if(resource.methods && resource.methods.indexOf(req.method) === -1){
			return app.error(req.uri, {statusCode: 405}).then(function(errorResource){
				if(errorResource){
					errorResource.render().pipe(res);
				}else{
					res.statusCode = 405;
					res.setHeader('Content-Type', 'text/plain');
					res.setHeader('Allow', resource.methods.join(', '));
					res.write('405 Method Not Allowed\r\n');
					res.end();
				}
			}).catch(function fail(err){
				if(!res.headersSent){
					res.statusCode = 500;
					res.setHeader('Content-Type', 'text/plain');
					res.end('500 Server Error occurred while processing a 405 Method Not Allowed response\r\n');
				}
				app.emitError(req, err);
			});
		}
		if(resource.lastModified){
			res.setHeader('Last-Modified', resource.lastModified.toUTCString());
		}
		if(resource.ETag){
			res.setHeader('ETag', '"'+resource.ETag.toString()+'"');
		}
		// TODO figure out if this Resource is the origin server or not
		if(req.headers['if-match'] && resource.ETag){
			// TODO handle multiple If-Match items
			if(req.headers['if-match']==='*'){
				// TODO do send this if the resource is not persisted yet
				//return void preconditionFail();
			}else if(req.headers['if-match'] !== '"'+resource.ETag+'"'){
				return void preconditionFail();
			}
		}else if(req.headers['if-unmodified-since'] && resource.lastModified){
			if(compareHTTPDateSince(req.headers['if-unmodified-since'], resource.lastModified) === true){
				return void preconditionFail();
			}
		}
		if(req.headers['if-none-match'] && resource.ETag){
			// TODO handle multiple If-Match items
			if(req.headers['if-none-match'] === '*'){
				// TODO don't send this if the resource is not persisted yet
				return void preconditionFail();
			}else if(req.headers['if-none-match'] === '"'+resource.ETag+'"'){
				return void preconditionFail();
			}
		}else if(req.headers['if-modified-since'] && resource.lastModified){
			if(compareHTTPDateSince(req.headers['if-modified-since'], resource.lastModified) === false){
				return void preconditionFail();
			}
		}
		function preconditionFail(){
			// TODO ensure these headers remain the same:
			// Cache-Control, Content-Location, Date, ETag, Expires, Vary
			if(req.method==='GET' || req.method==='HEAD'){
				res.statusCode = 304; // Not Modified
				res.end();
			}else{
				res.statusCode = 412; // Precondition Failed
				// TODO: Allow Resource to define custom handling for this situation
				res.end();
			}
		}
		var stream;
		if(req.method==='GET' || req.method==='HEAD'){
			stream = resource.render(req);
		}else if(req.method==='POST'){
			stream = resource.post(req, matchRoute);
		}else if(req.method==='PATCH'){
			// TODO first see if there's a native PATCH, else GET then PUT
			stream = resource.patch(req, matchRoute);
		}else if(req.method==='DELETE'){
			stream = resource.del(req, matchRoute);
		}else{
			// Otherwise, render a page describing the error
			stream = resource.render(req, matchRoute);
		}
		if(resource.contentType){
			res.setHeader('Content-Type', resource.contentType);
		}
		stream.pipe(res);
		stream.on('error', function(err){
			if(!res.headersSent){
				res.statusCode = 500;
				res.setHeader('Content-Type', 'text/plain');
				res.end('500 Server Error occurred while piping the stream output\r\n');
			}
			app.emitError(req, err);
		});
	}).catch(function failed(err){
		if(!res.headersSent){
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Internal Server Error\r\nAdditional details in console.\r\n');
		}
		app.emitError(req, err);
	});
};

Application.prototype.emitError = function emitError(req, err){
	if(typeof this.onError==='function'){
		this.onError(req, err);
	}else{
		throw err;
	}
};

// Resource class to handle TRACE requests whenever Max-Forwards is 0
// In other TRACE cases, this will be handled by Resource#trace
Application.prototype.TraceResource = TraceResource;

Application.prototype.initialize = function initialize(){
	const self = this;
	if(self.initializeComplete) return self.initializeComplete;
	if(!self.initializeLocks) self.initializeLocks = [];
	self.initializeComplete = Promise.all(self.initializeLocks.map(function(ev){
		return ev();
	}));
	return self.initializeComplete;
};

Application.prototype.before = function before(ev){
	const self = this;
	if(!self.initializeLocks) self.initializeLocks = [];
	if(ev) self.initializeLocks.push(ev);
};
