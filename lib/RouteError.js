var inherits = require('util').inherits;
var stream = require('stream');

var PassThrough = require('http-transform').PassThrough;
var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;

module.exports.RouteError = RouteError;
inherits(RouteError, Route);
function RouteError(code){
	if(!(this instanceof RouteError)) return new RouteError(code);
	this.code = code;
	Route.call(this);
}
RouteError.prototype.process = function handleNotFound(req, res, uri, param){
	var self = this;
	var body = new PassThrough;
	body.statusCode = self.code;
	if(body.setStatusCode) body.setStatusCode(self.code);
	body.setHeader('Content-Type', 'text/plain');
	body.write('Error ' + body.statusCode + ': '+uri+'\n');
	body.write(JSON.stringify(param)+'\n');
	body.end();
	return Promise.resolve(body);
}


