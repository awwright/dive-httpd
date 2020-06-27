"use strict";

var inherits = require('util').inherits;
var assert = require('assert');

var Route = require('./Route.js').Route;
var RouteURITemplate = require('./RouteURITemplate.js').RouteURITemplate;
var TraceResource = require('./Route.js').TraceResource;
var errors = require('./Error.js').errors;

module.exports.Application = Application;
inherits(Application, Route);
function Application(opts){
	if(!(this instanceof Application)) return new Application(opts);
	if(!opts) opts={};
	this.fixedScheme = opts.fixedScheme;
	this.fixedAuthority = opts.fixedAuthority;
	this.debug = opts.debug;
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
Application.prototype.error = function error(uri, err){
	assert(err instanceof Error);
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

	function emitError(err){
		assert(err instanceof Error);
		// First call this resource's error handler if it exists
		if(app.error){
			// Most of the time this is RouteURITemplate#error, which will find the first
			// matching Route with an error handler on it
			app.error(req.uri, err).then(function(errRsc){
				if(errRsc){
					errRsc.render(req).pipe(res);
				}else{
					app.writeError(req, res, err);
				}
			}).catch(function(err2){
				assert(err2 instanceof Error);
				app.writeError(req, res, err2);
				app.writeError(req, res, err);
			});
		}else{
			app.writeError(req, res, err);
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
		if(resource){
			try {
				const stream = resource.handle(req);
				stream.on('error', emitError);
				stream.pipe(res);
			}catch(err){
				emitError(err);
			}
		}else{
			// No resource has been found, or none was created
			// Go to the app and ask it to generate an error page
			return app.error(req.uri, new errors.NotFound({uri:req.uri})).then(function(errorResource){
				res.statusCode = 404;
				if(!errorResource){
					errorResource = app.defaultNotFound;
				}
				if(req.method==='TRACE'){
					// TRACE in the case (2/3) that the resource does not exist
					if(errorResource && errorResource.trace){
						res.statusCode = 200;
						errorResource.trace(req).pipe(res);
						return;
					}
					// If the errorResource does not specify a way to handle TRACE, then error
					return app.error(req.uri, new errors.NotImplemented({method:req.method})).then(function(notImplementedResource){
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
				if(!errorResource){
					// Gotta return something...
					res.setHeader('Content-Type', 'text/plain');
					res.end('404 Not Found\r\n');
					return;
				}
				errorResource.render(req).pipe(res);
			}).catch(function fail(err){
				app.writeError(req, res, err);
			});
		}
	}).catch(function failed(err){
		app.writeError(req, res, err);
	});
};

Application.prototype.writeError = function writeError(req, res, err){
	if((err && err.statusCode)===undefined || res.headersSent){
		// No status code means 500 error
		// If headers have already been sent, log the error regardless because we can't notify the user about the error
		if(typeof this.onError==='function'){
			this.onError(req, res, err);
		}else{
			// Outputting errors to the console is sensible here,
			// as Node.js would do this anyways.
			// eslint-disable-next-line no-console
			console.error('Uncaught error:', err);
		}
	}else{
		// log a user error (usually 4xx)
	}
	// If this.onError didn't respond to the error, then do that now
	if(!res.headersSent){
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/plain');
		if(err instanceof Error){
			if(err.statusCode){
				res.statusCode = err.statusCode;
			}
			if(this.debug){
				const message = err.stack || err.toString();
				res.end('Internal Server Error:\r\n' + message.replace(/\r?\n/g, '\r\n') + '\r\n');
			}else{
				res.end('Internal Server Error\r\nAdditional details in console.\r\n');
			}
		}else{
			res.end('Internal Server Error:\r\n[non-Error value thrown]\r\n');
		}
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
