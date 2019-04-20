
var qs = require('querystring');
var stream = require('stream');

var TemplateRouter = require('uri-template-router');
const { PassThrough } = require('http-transform');

var Route = require('./Route.js').Route;
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

HTTPServer.prototype.label = 'HTTPServer'

HTTPServer.prototype.prepare = function prepare(matchRoute, euri, queryMap, req){
	if(typeof matchRoute==='string'){
		var matchRoute = this.routes.resolveURI(matchRoute);
	}
	// Now loop through matching routes
	return testRoute(matchRoute);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler){
			return Promise.reject(new Error('Route definition missing'));
		}
		if(typeof handler.prepare!=='function'){
			return Promise.reject(new Error('Route#prepare not a function'));
		}
		return handler.prepare(matchRoute, euri, queryMap, req).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		});
	};
}

HTTPServer.prototype.addRoute = function addRoute(route){
	if(!(route instanceof Route)) throw new Error('Expected route to be an instanceof Route');
	var uriTemplate = route.routerURITemplate;
	if(typeof uriTemplate !== 'string') throw new Error('Expected route.routerURITemplate to be a string');
	var options = (typeof route.routerURITemplate==='object') ? route.routerOptions : {} ;
	this.routes.addTemplate(uriTemplate, options, route);
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

HTTPServer.prototype.listDependents = function listDependents(){
	return this.routes.routes.map(function(v){ return v.name; });
}

module.exports.handleRequest = handleRequest;
function handleRequest(options, req, res){
	var fixedScheme = options.fixedScheme || 'http';
	var fixedAuthority = options.fixedAuthority;
	var routes = options.routes;
	var RouteNotFound = options.RouteNotFound;
	var RouteError = options.RouteError;
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
		var queryMap = qs.parse(uriQuery);
	}
	if(req.method=='GET' || req.method==='HEAD' || req.method=='POST' || req.method=='PATCH' || req.method=='DELETE'){
		var resourceRequest = options.prepare(uriHier, euri, queryMap, req);
	}else if(req.method=='PUT'){
		var resourceRequest = options.store(req, res, matchRoute, euri, queryMap);
	}else{
		var resourceRequest = Promise.resolve(ResourceError(501));
	}
	resourceRequest.then(function filled(resource){
		if(!resource){
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/plain');
			res.end('404 Not Found\n');
			return;
		}
		var matchRoute = {};
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
	}, function failed(err){
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/plain');
		res.end('Internal Server Error\nAdditional adetails in console.\n');
		console.log(err);
	});
}

// After incoming rules have been applied and the request has been "normalized",
// process the request
module.exports.processRequest = processRequest;
function processRequest(serverOptions, req){

}
