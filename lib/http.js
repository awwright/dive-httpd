
var qs = require('querystring');
var stream = require('stream');

var TemplateRouter = require('uri-template-router');

var Route = module.exports.Route = require('./Route.js').Route;
var inherits = require('util').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.handleRequest = handleRequest;
function handleRequest(options, req, res){
	var fixedScheme = options.fixedScheme;
	var fixedAuthority = options.fixedAuthority;
	var routes = options.routes;
	var RouteNotFound = options.RouteNotFound;
	var RouteError = options.RouteError;
	if(typeof req.url!='string') throw new Error('Expected request.url to be a string');
	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	if(req.url[0]=='/'){
		var host = fixedAuthority || req.headers['host'];
		var euri = fixedScheme+'://'+host+req.url;
	}else if(req.url==='*'){
		// Make the server talk about itself
		var euri = 'http://localhost/';
	}else{
		var euri = req.url;
	}
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
		console.log(matchRoute.data);
		if(!matchRoute){
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/plain');
			res.write('404 Not Found\n');
			res.end();
			return;
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.prepare!=='function'){
			console.log(matchRoute);
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.write('Internal Server Error: Handler missing\n');
			res.end();
			return;
		}
		console.log('Request: '+euri);

		// If we have a route, try calling it to see if the target resource exists
		// Ask someone if they have the resource
		handler.prepare(matchRoute, euri, queryMap).then(function(resource){
			if(req.method==='GET' || req.method==='HEAD'){
				var stream = resource.render(req, res, matchRoute, euri, queryMap);
			}else if(req.method==='POST'){
				// TODO first see if there's a native PATCH, else GET then PUT
				var stream = resource.post(req, res, matchRoute, euri, queryMap);
			}else if(req.method==='PATCH'){
				// TODO first see if there's a native PATCH, else GET then PUT
				var stream = resource.patch(req, res, matchRoute, euri, queryMap);
			}else if(req.method==='DELETE'){
				// TODO first see if there's a native PATCH, else GET then PUT
				var stream = resource.del(req, res, matchRoute, euri, queryMap);
			}else if(req.method==='PUT'){
				// TODO first see if there's a native PATCH, else GET then PUT
				var stream = resource.put(req, res, matchRoute, euri, queryMap);
			}else{
				resource = ResourceError(501);
				var stream = resource.render(req, res, matchRoute, euri, queryMap);
			}
			if(stream){
				console.log(handler.pipeline);
				for(var s=stream, i=0; i<handler.pipeline.length; i++) s=s.pipe(handler.pipeline[i]);
				s.pipe(res);
			}else{
				res.statusCode = 500;
				res.setHeader('Content-Type', 'text/plain');
				res.write('Internal Server Error: Could not generate response stream\n');
				res.end();
				return;
			}
		}, function fail(err){
			if(matchRoute) return testRoute(matchRoute.next());
		}).then(function(stream){
			console.log(stream);
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
