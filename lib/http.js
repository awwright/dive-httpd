
var qs = require('querystring');
var stream = require('stream');

var TemplateRouter = require('uri-template-router');
const { PassThrough } = require('http-transform');

var Route = module.exports.Route = require('./Route.js').Route;
var inherits = require('util').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.HTTPServer = HTTPServer;
function HTTPServer(){
	this.fixedScheme = null;
	this.fixedAuthority = null;
	this.RouteNotFound = null;
	this.RouteError = null;
	this.routes = new TemplateRouter.Router();
}

HTTPServer.prototype.addRoute = function addRoute(handler){
	if(!(handler instanceof Route)) throw new Error('Expected handler to be an instanceof Route');
	var uriTemplate = handler.routerURITemplate;
	if(typeof uriTemplate !== 'string') throw new Error('Expected handler.routerURITemplate to be a string');
	var options = (typeof handler.routerURITemplate==='object') ? handler.routerOptions : {} ;
	this.routes.addTemplate(uriTemplate, options, handler);
}

HTTPServer.prototype.makeRequestBuffered = function makeRequestBuffered(req){
	var serverOptions = this;
	return new Promise(function(resolve, reject){
		var res = new PassThrough;
		handleRequest(serverOptions, req, res);
		var responseBody = '';
		res.on('data', function(block){
			responseBody += block;
		});
		res.on('end', function(){
			res.body = responseBody;
			return void resolve(res);
		});
		res.on('error', function(){
			console.error(arguments);
		});
	});
}

module.exports.handleRequest = handleRequest;
function handleRequest(options, req, res){
	var fixedScheme = options.fixedScheme || 'http';
	var fixedAuthority = options.fixedAuthority;
	var routes = options.routes;
	var RouteNotFound = options.RouteNotFound;
	var RouteError = options.RouteError;
	if(typeof req.url!='string'){
		throw new Error('Expected request.url to be a string');
	}
	var host = fixedAuthority || req.headers['host'];
	// TODO verify the Host against the whole ABNF and write tests
	if(host.indexOf(' ')>=0 || host.indexOf('/')>=0){
		throw new Error('Invalid Host');
	}
	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	// request-target = origin-form / absolute-form  / authority-form / asterisk-form

	if(req.url[0]=='/'){
		// origin-form
		var euri = fixedScheme+'://'+host+req.url;
	}else if(req.url==='*'){
		// asterisk-form
		// Make the server talk about itself
		var euri = 'http://'+host;
	}else{
		// absolute-form
		var euri = req.url;
	}
	// TODO implement authority-form
	// console.log('Request: '+euri);
	var queryOffset = euri.indexOf('?');
	var uriHier = euri;
	if(queryOffset >= 0){
		var uriHier = euri.substring(0, queryOffset);
		var uriQuery = euri.substring(queryOffset+1);
	}
	var queryMap = qs.parse(uriQuery);
	var matchRoute = routes.resolveURI(uriHier);
	// Now loop through matching routes
	testRoute(matchRoute);
	function testRoute(matchRoute){
		if(!matchRoute){
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/plain');
			res.end('404 Not Found\n');
			return;
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.prepare!=='function'){
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Internal Server Error: Handler missing\n');
			return;
		}

		// If we have a route, try calling it to see if the target resource exists
		// Ask someone if they have the resource
		if(req.method=='GET' || req.method==='HEAD' || req.method=='POST' || req.method=='PATCH' || req.method=='DELETE'){
			var resource = handler.prepare(matchRoute, euri, queryMap, req);
		}else if(req.method=='PUT'){
			var resource = handler.store(req, res, matchRoute, euri, queryMap);
		}else{
			var resource = Promise.resolve(ResourceError(501));
		}
		resource.then(function(resource){
			if(!resource){
				if(matchRoute) testRoute(matchRoute.next());
				return;
			}
			if(req.method==='GET' || req.method==='HEAD'){
				var s = resource.render(req, res, matchRoute, euri, queryMap, options);
				if(s){
					var stream = s;
				}else{
					res.statusCode = 500;
					res.setHeader('Content-Type', 'text/plain');
					res.write('Internal Server Error: Could not generate response stream\n');
					res.end();
					return;
				}
			}else if(req.method==='POST'){
				var stream = resource.post(req, res, matchRoute, euri, queryMap, options);
			}else if(req.method==='PATCH'){
				// TODO first see if there's a native PATCH, else GET then PUT
				var stream = resource.patch(req, res, matchRoute, euri, queryMap, options);
			}else if(req.method==='DELETE'){
				var stream = resource.del(req, res, matchRoute, euri, queryMap, options);
			}else{
				// Otherwise, render a page describing the error
				var stream = resource.render(req, res, matchRoute, euri, queryMap, options);
			}
			stream.pipe(res);
		}, function fail(err){
			if(err.notfound){
				if(matchRoute) testRoute(matchRoute.next());
				return;
			}
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Internal Server Error\nAdditional adetails in console.\n');
			console.log(err);
		}).then(function(stream){
			//console.log(stream);
			// When contents are rendered, write to output
		});
	};
}

// After incoming rules have been applied and the request has been "normalized",
// process the request
module.exports.processRequest = processRequest;
function processRequest(serverOptions, req){

}

// Section 1. Define how to process a request that matches a given route

// Try a series of alternatives, use the first successful dereference
module.exports.First = First;
inherits(First, Route);
function First(list){
	if(!(this instanceof First)) return new First(list);
	// if(typeof routerURITemplate!=='string') throw new Error('Expected string `routerURITemplate`');
	// this.routerURITemplate = routerURITemplate;
	if(!Array.isArray(list)) throw new Error('Expected arguments[0] `list` to be an Array');
	list.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
	});
	this.list = list;
	this.name = 'First['+ list.map(function(v){ return v.name; }).join(',') +']'
	Route.call(this);
}
First.prototype.name = 'First';
First.prototype.listing = function listing(routes){
	return Promise.all(this.list.map(function(route){
		return route.listing();
	})).then(function(routes){
		var list = [];
		routes.forEach(function(listing){
			listing.forEach(function(v){
				if(list.indexOf(v)<0) list.push(v);
			});
		});
		return Promise.resolve(list);
	});
}
First.prototype.watch = function watch(fn){
	var list = [];
	this.list.forEach(function(i){
		i.watch(fn);
	});
	return list;
}
First.prototype.prepare = function prepare(route, euri, queryMap){
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	var list = this.list;
	return testRoute(0);
	function testRoute(route_i){
		var handler = list[route_i];
		if(!handler) return Promise.reject();
		return handler.prepare(route, euri, queryMap).then(function(stream){
			if(!stream) throw new Error('expected argument stream');
			return Promise.resolve(stream);
		}, function(err){
			return testRoute(route_i+1);
		});
	}
}
