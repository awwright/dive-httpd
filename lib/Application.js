"use strict";

const { inherits, promisify } = require('util');
const finished = promisify(require('stream').finished);
const assert = require('assert');

const { Route } = require('./Route.js');
const { RouteURITemplate } = require('./RouteURITemplate.js');
const { TraceResource } = require('./Route.js');
const { errors } = require('./Error.js');

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
	return this.innerRoute.error(uri, err);
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

	if(!req.uri || typeof req.uri!=='string'){
		throw new Error('Expected `req.uri` to be a string');
	}
	if(!req.headers || typeof req.headers!=='object'){
		throw new Error('Expected `req.headers` to be an object');
	}

	return this.initialize().then(async function(){
		if(req.headers['max-forwards']==='0'){
			if(req.method==='TRACE'){
				// TRACE in the case (1/3) that the max-forwards is 0,
				// which must be handled by the server directly before it is routed
				res.statusCode = 200;
				new app.TraceResource(this).render(req).pipeMessage(res);
				return;
			}else if(req.method==='OPTIONS'){
				/// TODO query the part that forwards the request, but don't let it forward this particular message
				res.end();
				return;
			}
		}

		const alloc = (req.method==='PUT' || req.method==='PATCH') && await app.prepare(req.uri);
		const resource = alloc || await app.prepare(req.uri);
		if(resource){
			const stream = resource.handle(req);
			if(!stream || !stream.pipe){
				throw new Error(`${resource.name || resource.constructor.name}#handle did not return a stream`);
			}
			stream.pipeMessage(res);
			await finished(stream);
		}else{
			// No resource has been found, or none was created
			// Go to the app and ask it to generate an error page
			const notFoundError = new errors.NotFound({uri:req.uri});
			const errorResource = await app.error(req.uri, notFoundError) || (app.defaultNotFound && await app.defaultNotFound());
			res.statusCode = 404;
			if(req.method==='TRACE'){
				// TRACE in the case (2/3) that the resource does not exist
				if(errorResource && errorResource.trace){
					res.statusCode = 200;
					const stream = errorResource.trace(req).pipeMessage(res);
					return await finished(stream);
				}
				// If the errorResource does not specify a way to handle TRACE, then error
				throw new errors.NotImplemented({method:req.method});
			}
			if(!errorResource){
				// Gotta return something...
				res.setHeader('Content-Type', 'text/plain');
				res.end('404 Not Found\r\n');
				return;
			}
			const stream = errorResource.render(req);
			stream.on('error', (err)=>res.destroy(err));
			await finished(stream.pipeMessage(res));
		}
	}).catch(function failed(err){
		// The selected representation emitted an error
		// Handle it and return a representation describing what happened
		assert(err instanceof Error);
		// First call this resource's error handler if it exists
		if(!app.error) return void app.writeError(req, res, err);
		// Most of the time this is RouteURITemplate#error, which will find the first
		// matching Route with an error handler on it
		return app.error(req.uri, err).then(function(errRsc){
			if(errRsc){
				errRsc.render(req).pipeMessage(res);
			}else{
				app.writeError(req, res, err);
			}
		}).catch(function(err2){
			assert(err2 instanceof Error);
			app.writeError(req, res, err2);
			app.writeError(req, res, err);
		});
	});
};

Application.prototype.writeError = function writeError(req, res, err){
	if(res.headersSent){
		// If headers have already been sent, log the error because we can't notify the user about the error
		if(typeof this.onError==='function'){
			this.onError(req, res, err);
		}else{
			throw err;
		}
		return;
	}
	if((err && err.statusCode)===undefined){
		// No status code means 500 error
		if(typeof this.onError==='function'){
			this.onError(req, res, err);
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
	if(this.innerRoute.initialize) self.initializeLocks.push(this.innerRoute.initialize.bind(this.innerRoute));
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
