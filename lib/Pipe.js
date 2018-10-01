var inherits = require('./tk.js').inherits;
var Processor = require('./tk.js').Processor;

// The Pipe is a wrapper around another router that first calls that router, then processes it through a transform stream before returning.
inherits(Pipe, Processor);
module.exports.Pipe = Pipe;
function Pipe(upstream, transform){
	this.upstream = upstream;
	if(typeof transform != 'function') throw new Error('Expected function');
	this.transform = transform;
	this.name = upstream.name;
}
Pipe.prototype.process = function process(req, res, route, euri, queryMap){
	var pipe = this;
	return this.upstream.process(req, res, route, euri, queryMap).then(function(r){
		return Promise.resolve(r.pipe(pipe.transform()));
	});
}
Pipe.prototype.index = function(routes){
	var list = this.upstream.index(routes);
	return list;
}
Pipe.prototype.pipe = function pipe(transform){
	return new Pipe(this, transform);
}

