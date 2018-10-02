
module.exports.inherits = inherits;
function inherits(ctor, superCtor) {
	//ctor.super_ = superCtor;
	ctor.prototype = Object.create(superCtor.prototype, {
		constructor: { value: ctor, enumerable: false },
	});
};


// Generic class that handles a request
module.exports.Processor = Processor;
function Processor(){
}
// Return a list of variables that will produce a valid resource for this pattern
Processor.prototype.index = function index(routes){
	throw new Error('abstract');
}
// Accept a request and return a resource stream
Processor.prototype.process = function process(){
	throw new Error('abstract');
}
