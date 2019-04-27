
var qs = require('querystring');

var TemplateRouter = require('uri-template-router');
const { PassThrough } = require('http-transform');

var Route = require('./Route.js').Route;
var inherits = require('util').inherits;
module.exports.RouteStaticFile = require('./RouteStaticFile.js').RouteStaticFile;

module.exports.HTTPServer = HTTPServer;
inherits(HTTPServer, Route);
function HTTPServer(){
	this.fixedScheme = null;
	this.fixedAuthority = null;
	this.routes = new TemplateRouter.Router();
	this.onError = null;
}

HTTPServer.prototype.label = 'HTTPServer';

HTTPServer.prototype.prepare = function prepare(uri, euri, queryMap, req){
	if(typeof uri==='string'){
		var matchRoute = this.routes.resolveURI(uri);
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
	}
}

// HTTPServer defines Route#error mostly the same as Route#prepare:
// Iterate through the best matches, seeing who wants to take responsibility first
HTTPServer.prototype.error = function error(uri, error){
	var match = typeof uri==='string' ? this.routes.resolveURI(uri) : uri;
	if(!match) return Promise.resolve();
	// Now loop through matching routes
	return testRoute(match);
	function testRoute(matchRoute){
		if(!matchRoute){
			return Promise.resolve();
		}
		var handler = matchRoute && matchRoute.name;
		if(!handler || typeof handler.error!=='function'){
			return testRoute(matchRoute.next());
		}
		return handler.error(matchRoute, error).then(function(resource){
			if(resource) return Promise.resolve(resource);
			else return testRoute(matchRoute.next());
		});
	}
}

HTTPServer.prototype.addRoute = function addRoute(route){
	if(!(route instanceof Route)) throw new Error('Expected route to be an instanceof Route');
	var uriTemplate = route.uriTemplate;
	if(typeof uriTemplate !== 'string') throw new Error('Expected route.uriTemplate to be a string');
	var options = (typeof route.uriTemplate==='object') ? route.routerOptions : {} ;
	this.routes.addTemplate(uriTemplate, options, route);
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
	return this.routes.routes.map(function(v){ return v.name; });
}

HTTPServer.prototype.handleRequestFactory = function handleRequestFactory(){
	return this.handleRequest.bind(this);
};

HTTPServer.prototype.handleRequest = function handleRequest(req, res){
	var options = this;
	var fixedScheme = options.fixedScheme || 'http';
	var fixedAuthority = options.fixedAuthority;
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
	// TODO implement authority-form
	// console.log('Request: '+euri);
	var queryOffset = euri.indexOf('?');
	var uriHier = euri;
	if(queryOffset >= 0){
		uriHier = euri.substring(0, queryOffset);
		var uriQuery = euri.substring(queryOffset+1);
		var queryMap = qs.parse(uriQuery);
	}
	var resourceRequest;
	if(req.method=='GET' || req.method==='HEAD' || req.method=='POST' || req.method=='PATCH' || req.method=='DELETE'){
		resourceRequest = options.prepare(uriHier, euri, queryMap, req);
	}else if(req.method=='PUT'){
		resourceRequest = options.store(req, res);
	}else{
		resourceRequest = options.error(uriHier, {statusCode: 501});
	}
	return resourceRequest.then(function filled(resource){
		if(!resource){
			return options.error(uriHier, {statusCode:404}).then(function(errorResource){
				res.statusCode = 404;
				if(errorResource){
					errorResource.render(req, res, null, null, null, options).pipe(res);
				}else if(options.defaultNotFound){
					options.defaultNotFound.render(req, res, null, null, null, options).pipe(res);
				}else{
					// Gotta return something...
					res.setHeader('Content-Type', 'text/plain');
					res.end('404 Not Found\r\n');
				}
			}, function fail(err){
				res.statusCode = 500;
				res.setHeader('Content-Type', 'text/plain');
				res.end('500 Server Error occured while processing a Not Found response\r\n');
				if(err) options.emitError(err);
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
			});
		}
		var stream;
		if(req.method==='GET' || req.method==='HEAD'){
			stream = resource.render(req, res, matchRoute, euri, queryMap, options);
		}else if(req.method==='POST'){
			stream = resource.post(req, res, matchRoute, euri, queryMap, options);
		}else if(req.method==='PATCH'){
			// TODO first see if there's a native PATCH, else GET then PUT
			stream = resource.patch(req, res, matchRoute, euri, queryMap, options);
		}else if(req.method==='DELETE'){
			stream = resource.del(req, res, matchRoute, euri, queryMap, options);
		}else{
			// Otherwise, render a page describing the error
			stream = resource.render(req, res, matchRoute, euri, queryMap, options);
		}
		stream.pipe(res);
	}, function failed(err){
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/plain');
		res.end('Internal Server Error\r\nAdditional details in console.\r\n');
		if(err) options.emitError(err);
	});
}

module.exports.handleRequest = function handleRequest(app, req, res){
	return app.handleRequest(req, res);
}

HTTPServer.prototype.emitError = function emitError(err){
	if(typeof this.onError==='function'){
		this.onError(err);
	}
}
