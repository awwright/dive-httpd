var inherits = require('./tk.js').inherits;
var inherits = require('./tk.js').inherits;
var Processor = require('./tk.js').Processor;
var stream = require('stream');

// Pipe through an HTTP request - can serve to merge two streams together, e.g. to set Content-Type
module.exports.PassThrough = PassThrough;
inherits(PassThrough, stream.PassThrough);
function PassThrough(){
	stream.PassThrough.apply(this, arguments);
}

PassThrough.prototype.setHeader = function(){
	
}

PassThrough.prototype.setContentType = function(){
	
}

