"use strict";

var inherits = require('util').inherits;

// A Resource is an instance representing a confirmation that the requested resource exists,
// and some data about it, but not necessarially all of the data
module.exports.Resource = Resource;
function Resource(route, opts, data){
	this.route = route;
	if(opts && typeof opts=='object'){
		this.opts = opts;
	}
	if(data && typeof data==='object'){
		for(var k in data){
			if(!Object.hasOwnProperty.call(this, k)) this[k] = data[k];
		}
	}
}

// Generate a ReadableStream of the resource
Resource.prototype.render = function render(){
	throw new Error('unimplemented');
}

// Generate a string of the resource
// Reject or throw an error if the resource has no Unicode representation (e.g. an image)
Resource.prototype.renderString = function renderString(){
	throw new Error('unimplemented');
}

// Generate a Uint8Array of the resource
Resource.prototype.renderBytes = function renderBytes(){
	throw new Error('unimplemented');
}

Resource.prototype.methods = ['GET', 'HEAD'];

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

// A StreamResource is a resource that natively works best returning an HTTPResponse stream
// It provides functions to buffer that stream and return a ByteArray (UInt8Array) or a string
exports.StreamResource = StreamResource;
inherits(StreamResource, Resource);
function StreamResource(){
	Resource.apply(this, arguments);
}
StreamResource.prototype.render = function render(req, res){
	return this.route.render(this, req, res);
}
StreamResource.prototype.error = function error(uri, error){
	return this.route.error ? this.route.error(uri, error) : Promise.resolve();
}
StreamResource.prototype.renderString = function renderString(){
	var self = this;
	return new Promise(function(resolve, reject){
		var stream = self.render();
		var bufferList = [];
		var bufferSize = 0;
		stream.on('data', function(b){
			bufferSize += b.length;
			bufferList.push(b);
		});
		stream.on('end', function(){
			stream.body = Buffer.concat(bufferList, bufferSize).toString();
			resolve(stream);
		});
		stream.on('error', reject);
	});
}
StreamResource.prototype.renderBytes = function renderBytes(){
	var self = this;
	return new Promise(function(resolve, reject){
		var stream = self.render();
		var bufferList = [];
		var bufferSize = 0;
		stream.on('data', function(b){
			bufferSize += b.length;
			bufferList.push(b);
		});
		stream.on('end', function(){
			stream.body = Buffer.concat(bufferList, bufferSize);
			stream.pipe = null;
			resolve(stream);
		});
		stream.on('error', reject);
		stream.resume();
	});
}
