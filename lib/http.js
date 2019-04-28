
var qs = require('querystring');

const { PassThrough } = require('http-transform');

var Route = require('./Route.js').Route;
var RouteURITemplate = require('./RouteURITemplate.js').RouteURITemplate;
var inherits = require('util').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.HTTPServer = HTTPServer;
inherits(HTTPServer, Route);
function HTTPServer(opts){
	if(!opts) opts={};
	this.fixedScheme = opts.fixedScheme;
	this.fixedAuthority = opts.fixedAuthority;
	// If true, Host header is not required,
	// however fixedAuthority or the absolute-form must provide it if missing.
	// This is mostly to make scripting/testing easier.
	this.relaxedHost = false;
	// Allow an alternate router to be specified, but default to the URI Template router
	this.innerRoute = opts.innerRoute || new RouteURITemplate({routes: opts.routes});
	this.onError = null;
}

HTTPServer.prototype.label = 'HTTPServer';

HTTPServer.prototype.prepare = function prepare(){
	return this.innerRoute.prepare.apply(this.innerRoute, arguments);
}

// HTTPServer defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
HTTPServer.prototype.error = function error(){
	return this.innerRoute.error.apply(this.innerRoute, arguments);
}

HTTPServer.prototype.addRoute = function addRoute(){
	this.innerRoute.addRoute.apply(this.innerRoute, arguments);
}

HTTPServer.prototype.makeRequestBuffered = function makeRequestBuffered(req){
	var serverOptions = this;
	return new Promise(function(resolve){
		var res = new PassThrough;
		serverOptions.handleRequest(req, res);
		var responseBody = '';
		res.on('data', function(block){
			responseBody += block;
		});
		res.on('end', function(){
			res.body = responseBody;
			return void resolve(res);
		});
		res.on('error', function(err){
			serverOptions.emitError(err);
		});
	});
}

HTTPServer.prototype.listDependents = function listDependents(){
	return [ this.innerRoute ];
}

HTTPServer.prototype.handleRequestFactory = function handleRequestFactory(){
	return this.handleRequest.bind(this);
};

HTTPServer.prototype.handleRequest = function handleRequest(req, res){
	var app = this;
	var fixedScheme = app.fixedScheme || 'http';
	var fixedAuthority = app.fixedAuthority;
	if(typeof req.url!=='string'){
		throw new Error('Expected `req.url` to be a string');
	}
	if(typeof req.headers!=='object'){
		throw new Error('Expected `req.headers` to be an object');
	}
	var host = fixedAuthority || req.headers['host'];
	// TODO verify the Host against the whole ABNF and write tests
	if(host.indexOf(' ')>=0 || host.indexOf('/')>=0){
		throw new Error('Invalid Host');
	}
	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	// request-target = origin-form / absolute-form  / authority-form / asterisk-form

	var euri;
	if(req.url[0]=='/'){
		// origin-form
		euri = fixedScheme+'://'+host+req.url;
	}else if(req.url==='*'){
		// asterisk-form
		// Make the server talk about itself
		euri = 'http://'+host;
	}else{
		// absolute-form
		euri = req.url;
	}
	req.uri = euri;
	app.request(req, res).then(function(){
		// console.error(req.method+' '+req.uri);
	});
}

HTTPServer.prototype.request = function request(req, res){
	var app = this;
	var euri = req.uri;
	// TODO implement authority-form
	// console.log('Request: '+euri);
	var queryOffset = euri.indexOf('?');
	var uriHier = euri;
	if(queryOffset >= 0){
		uriHier = euri.substring(0, queryOffset);
		var uriQuery = euri.substring(queryOffset+1);
		var queryMap = qs.parse(uriQuery);
	}
	// In most cases app.innerRoute.request should not do anything except call next()
	// If it exists at all
	var query, processed=true;
	if(app.innerRoute.request){
		query = app.innerRoute.request(req, res, function(){
			processed = false;
			return Promise.resolve();
		});
	}
	if(!query){
		query = Promise.resolve();
	}
	return query.then(function(){
		if(processed) return;
		return app.prepare(uriHier).then(function(resourceRequest){
			if(!resourceRequest && req.method==='PUT'){
				return app.store(uriHier);
			}
			return resourceRequest;
		});
	}).then(function(resource){
		if(processed) return;
		if(!resource){
			return app.error(uriHier, {statusCode:404}).then(function(errorResource){
				res.statusCode = 404;
				if(errorResource){
					errorResource.render(req, res, null, null, null, app).pipe(res);
				}else if(app.defaultNotFound){
					app.defaultNotFound.render(req, res, null, null, null, app).pipe(res);
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
			stream = resource.render(req, res, matchRoute, euri, queryMap, app);
		}else if(req.method==='POST'){
			stream = resource.post(req, res, matchRoute, euri, queryMap, app);
		}else if(req.method==='PATCH'){
			// TODO first see if there's a native PATCH, else GET then PUT
			stream = resource.patch(req, res, matchRoute, euri, queryMap, app);
		}else if(req.method==='DELETE'){
			stream = resource.del(req, res, matchRoute, euri, queryMap, app);
		}else{
			// Otherwise, render a page describing the error
			stream = resource.render(req, res, matchRoute, euri, queryMap, app);
		}
		stream.pipe(res);
	}).catch(function failed(err){
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/plain');
		res.end('Internal Server Error\r\nAdditional details in console.\r\n');
		app.emitError(req, err);
	});
}

module.exports.handleRequest = function handleRequest(app, req, res){
	return app.handleRequest(req, res);
}

HTTPServer.prototype.emitError = function emitError(req, err){
	if(typeof this.onError==='function'){
		this.onError(req, err);
	}
}
