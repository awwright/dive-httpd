
var qs = require('querystring');
var stream = require('stream');

var TemplateRouter = require('uri-template-router');

var Processor = module.exports.Processor = require('./tk.js').Processor;
var inherits = module.exports.inherits = require('./tk.js').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.handleRequest = handleRequest;
function handleRequest(options, req, res){
	var fixedScheme = options.fixedScheme;
	var fixedAuthority = options.fixedAuthority;
	var routes = options.routes;
	var RouteNotFound = options.RouteNotFound;
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
	var route = routes.resolveURI(uriHier);
	testRoute(route);
	function testRoute(route){
		var handler = route && route.name;
		console.log('Request: '+euri);
		if(!handler){
			res.statusCode = 404;
			handler = new RouteNotFound;
		}
		// If we have a route, try calling it to see if the target resource exists
		if(handler && typeof handler.process=='function'){
			handler.process(req, res, route, euri, queryMap).then(function(stream){
				try{
					stream.pipe(res);
				}catch(e){
					console.error('e', e);
				}
			}).catch(function(err){
				console.error(err);
				if(route) testRoute(route.next());
			});
		}else{
			res.statusCode = 500;
			res.setHeader('Content-Type', 'text/plain');
			res.write('Internal Server Error: Handler missing\n');
			res.end();
		}
	}
}


// Section 1. Define how to process a request that matches a given route
module.exports.Conneg = Conneg;
function Conneg(){
	return {};
}

// Try a series of alternatives, use the first successful dereference
module.exports.First = First;
function First(list){
	if(!Array.isArray(list)) throw new Error('Expected arguments[0] to be an Array');
	list.forEach(function(item){
		if(!(item instanceof Processor))  throw new Error('Expected arguments[0][i] to be a Processor');
	});
	this.list = list;
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
First.prototype.process = function process(req, res, route, euri, queryMap){
	// Iterate through each item in `list`
	// If match is found, return that
	// Otherwise (if no match), push AttemptedRequestInformation data and discard other data blocks, then try next handler
	// If none are found, return NoMatch
	var list = this.list;
	return testRoute(0);
	function testRoute(route_i){
		var handler = list[route_i];
		if(!handler) return Promise.reject();
		return handler.process(req, res, route, euri, queryMap).then(function(stream){
			return Promise.resolve(stream);
		}).catch(function(err){
			testRoute(route_i+1);
		});
	}
}



