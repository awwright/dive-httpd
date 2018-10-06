
var inherits = require('util').inherits;
var stream = require('stream');

var PassThrough = require('http-transform').PassThrough;
var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;

module.exports.RouteNotFound = RouteNotFound;
inherits(RouteNotFound, Route);
function RouteNotFound(req, res, uri, param){
	if(!(this instanceof RouteNotFound)) return new RouteNotFound(req, res, uri, param);
}
RouteNotFound.prototype.process = function handleNotFound(req, res, uri, param){
	return Promise.resolve(new ResourceNotFound(this));
}

// This is a Resource describing why the request-uri was not found
module.exports.ResourceNotFound = ResourceNotFound;
inherits(ResourceNotFound, Resource);
function ResourceNotFound(route){
	if(!(this instanceof ResourceNotFound)) return new ResourceNotFound(route);
	this.route = route;
}
ResourceNotFound.prototype.process = function handleNotFound(req, res, uri, param){
	var body = new PassThrough;
	body.statusCode = 404;
	if(body.setStatusCode) body.setStatusCode(404);
	body.setHeader('Content-Type', 'text/plain');
	body.write('Page not found: '+uri+'\n');
	body.write(JSON.stringify(param)+'\n');
	body.end();
	return Promise.resolve(body);
}
