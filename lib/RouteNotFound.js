
var stream = require('stream');

var PassThrough = require('./PassThrough.js').PassThrough;

module.exports.RouteNotFound = RouteNotFound;

function RouteNotFound(req, res, uri, param){
}
RouteNotFound.prototype.process = function handleNotFound(req, res, uri, param){
	var body = new PassThrough;
	body.statusCode = 404;
	if(body.setStatusCode) body.setStatusCode(404);
	body.setHeader('Content-Type', 'text/plain');
	body.write('Page not found: '+uri+'\n');
	body.write(JSON.stringify(param)+'\n');
	body.end();
	return Promise.resolve(body);
}


