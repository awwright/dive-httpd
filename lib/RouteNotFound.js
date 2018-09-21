
var stream = require('stream');

module.exports.RouteNotFound = RouteNotFound;

function RouteNotFound(req, res, uri, param){
}
RouteNotFound.prototype.process = function handleNotFound(req, res, uri, param){
	res.statusCode = 404;
	res.setHeader('Content-Type', 'text/plain');
	var body = new stream.PassThrough;
	body.write('Page not found: '+uri+'\n');
	body.write(JSON.stringify(param)+'\n');
	body.end();
	return body;
}


