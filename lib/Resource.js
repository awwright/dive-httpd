
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

Resource.prototype.post = function post(){
	return Promise.fail();
}

Resource.prototype.del = function del(uri, request){
	return Promise.fail();
}

Resource.prototype.patch = function patch(uri, request){
	return Promise.fail();
}

Resource.prototype.end = function end(uri, request){
}


