
var qs = require('querystring');
var stream = require('stream');

var TemplateRouter = require('uri-template-router');

var Route = module.exports.Route = require('./Route.js').Route;
var inherits = require('util').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.HTTPServer = HTTPServer;
function HTTPServer(){
	this.router = new TemplateRouter.Router();
}


module.exports.handleRequest = handleRequest;
function handleRequest(options, req, res){
	var fixedScheme = options.fixedScheme;
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
			res.write('404 Not Found\n');
			res.end();
			return;
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.prepare!=='function'){
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.write('Internal Server Error: Handler missing\n');
			res.end();
			return;
		}
//		console.log('Request: '+euri);

		// If we have a route, try calling it to see if the target resource exists
		// Ask someone if they have the resource
		if(req.method=='GET' || req.method==='HEAD' || req.method=='POST' || req.method=='PATCH' || req.method=='DELETE'){
			var resource = handler.prepare(matchRoute, euri, queryMap);
		}else if(req.method=='PUT'){
			var resource = handler.store(req, res, matchRoute, euri, queryMap);
		}else{
			var resource = Promise.resolve(ResourceError(501));
		}
		resource.then(function(resource){
			if(req.method==='GET' || req.method==='HEAD'){
				var s = resource.render(req, res, matchRoute, euri, queryMap, options);
				if(s){
					for(var stream=s, i=0; i<handler.pipeline.length; i++) stream=stream.pipe(handler.pipeline[i]);
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
			if(matchRoute) return testRoute(matchRoute.next());
		}).then(function(stream){
			//console.log(stream);
			// When contents are rendered, write to output
		});
	};
}


// Section 1. Define how to process a request that matches a given route
module.exports.Conneg = Conneg;
function Conneg(){
	return {};
}

// Try a series of alternatives, use the first successful dereference
module.exports.First = First;
inherits(First, Route);
function First(list){
	if(!(this instanceof First)) return new First(list);
	if(!Array.isArray(list)) throw new Error('Expected arguments[0] to be an Array');
	list.forEach(function(item){
		if(!(item instanceof Route))  throw new Error('Expected arguments[0][i] to be a Route');
	});
	this.list = list;
	Route.call(this);
}
First.prototype.index = function index(routes){
	var list = [];
	this.list.forEach(function(i){
		i.index(routes).forEach(function(v){
			list.push(v);
		});
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
