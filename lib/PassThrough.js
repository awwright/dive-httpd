const inherits = require('util').inherits;

var ServerResponseTransform = require('./ServerResponseTransform.js').ServerResponseTransform;

// Pipe through an HTTP request - can serve to merge two streams together, e.g. to set Content-Type
module.exports.PassThrough = ServerResponsePassThrough;
inherits(ServerResponsePassThrough, ServerResponseTransform);
function ServerResponsePassThrough(){
	if (!(this instanceof ServerResponsePassThrough)){
		return new ServerResponsePassThrough(options);
	}
	ServerResponseTransform.apply(this, arguments);
}

ServerResponsePassThrough.prototype._transformContentType = function(value, cb) {
	cb(null, value);
};

ServerResponsePassThrough.prototype._transformHeader = function(name, value, cb) {
	cb(null, name, value);
};

ServerResponsePassThrough.prototype._transform = function(chunk, encoding, cb) {
	var x = chunk.toString();
	cb(null, chunk);
};


