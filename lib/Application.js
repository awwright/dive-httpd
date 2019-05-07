"use strict";

var qs = require('querystring');

var Route = require('./Route.js').Route;
var RouteURITemplate = require('./RouteURITemplate.js').RouteURITemplate;
var inherits = require('util').inherits;

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
	this.onReady = this.innerRoute.onReady;
}

Application.prototype.label = 'Application';

Application.prototype.prepare = function prepare(){
	return this.innerRoute.prepare.apply(this.innerRoute, arguments);
}

// Application defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
Application.prototype.error = function error(){
	return this.innerRoute.error.apply(this.innerRoute, arguments);
}

Application.prototype.listing = function listing(){
	return this.innerRoute.listing.apply(this.innerRoute, arguments);
}

Application.prototype.addRoute = function addRoute(){
	this.innerRoute.addRoute.apply(this.innerRoute, arguments);
	this.onReady = this.innerRoute.onReady;
}

Application.prototype.listDependents = function listDependents(){
	return [ this.innerRoute ];
}

Application.prototype.handleRequest = function handleRequest(req, res){
	var app = this;

	if(typeof req.uri!=='string'){
		throw new Error('Expected `req.uri` to be a string');
	}
	if(typeof req.headers!=='object'){
		throw new Error('Expected `req.headers` to be an object');
	}

	return app.prepare(req.uri).then(function(resourceRequest){
		if(!resourceRequest && req.method==='PUT'){
			return app.store(uriHier);
		}
		return resourceRequest;
	}).then(function(resource){
		if(!resource){
			return app.error(req.uri, {statusCode:404}).then(function(errorResource){
				res.statusCode = 404;
				if(errorResource){
					errorResource.render(req).pipe(res);
				}else if(app.defaultNotFound){
					app.defaultNotFound.render(req).pipe(res);
				}else{
					// Gotta return something...
					res.setHeader('Content-Type', 'text/plain');
					res.end('404 Not Found\r\n');
				}
			}).catch(function fail(err){
				res.statusCode = 500;
				res.setHeader('Content-Type', 'text/plain');
				res.end('500 Server Error occured while processing a Not Found response\r\n');
				app.emitError(req, err);
			});
		}
		var matchRoute = {};
		if(resource.methods.indexOf(req.method) === -1){
			return resource.error(uriHier, {statusCode: 405}).then(function(errorResource){
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
				res.statusCode = 500;
				res.setHeader('Content-Type', 'text/plain');
				res.end('500 Server Error occured while processing a 405 Method Not Allowed response\r\n');
				app.emitError(req, err);
			});
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
		stream.pipe(res);
	}).catch(function failed(err){
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/plain');
		res.end('Internal Server Error\r\nAdditional details in console.\r\n');
		app.emitError(req, err);
	});
}

Application.prototype.emitError = function emitError(req, err){
	if(typeof this.onError==='function'){
		this.onError(req, err);
	}else{
		throw err;
	}
}
