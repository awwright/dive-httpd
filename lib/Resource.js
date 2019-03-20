
var inherits = require('util').inherits;

module.exports.Resource = Resource;
function Resource(opts){
	if(opts && typeof opts=='object'){
	}
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Resource.prototype.render = function render(uri, data){
	throw new Error('unimplemented');
}

// Accept data for evaluation by this resource
Resource.prototype.post = function post(){
	return Promise.reject(new Error('unimplemented'));
}

// Delete this resource from the underlying data store
Resource.prototype.del = function del(){
	return Promise.reject(new Error('unimplemented'));
}

// Modify this resource (according to uploaded instructions)
Resource.prototype.patch = function patch(){
	return Promise.reject(new Error('unimplemented'));
}

Resource.prototype.end = function end(){
}

Resource.prototype.getReference = function getReference(uri){
	// get the effective URI of the current resource - the URI of the resource that the server is using
	var rURI = this.whatever;
	// Compare it to the local namespace
}


