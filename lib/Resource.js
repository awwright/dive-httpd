"use strict";

var inherits = require('util').inherits;

var PassThrough = require('http-transform').PassThrough;

// A Resource is an instance representing a confirmation that the requested resource exists,
// and some data about it, but not necessarially all of the data
module.exports.Resource = Resource;
function Resource(route, opts, data){
	this.route = route;
	if(opts && typeof opts=='object'){
		this.opts = opts;
		if(opts.match){
			if(typeof opts.match.uri !== 'string'){
				throw new Error('Expected opts.match.uri to be a string');
			}
			this.match = opts.match;
			this.uri = opts.match.uri;
			this.uriTemplate = opts.match.uriTemplate;
			this.params = opts.match.params;
		}else if(opts.uri){
			if(typeof opts.uri !== 'string'){
				throw new Error('Expected opts.uri to be a string');
			}
			this.uri = opts.uri;
		}
		if(opts.contentType){
			if(typeof opts.contentType !== 'string'){
				throw new Error('Expected opts.contentType to be a string');
			}
			this.contentType = opts.contentType;
		}else if(route.contentType){
			this.contentType = route.contentType;
		}
		if(opts.inner){
			if(!(opts.inner instanceof Resource)){
				throw new Error('Expected opts.inner to be a Resource');
			}
			this.inner = opts.inner;
		}
	}
	if(data && typeof data==='object'){
		for(var k in data){
			if(!Object.hasOwnProperty.call(this, k)) this[k] = data[k];
		}
	}
}

// Generate a ReadableStream of the resource
Resource.prototype.render = function render(req){
	return this.route.render(this, req);
}

// Generate a string of the resource
// Reject or throw an error if the resource has no Unicode representation (e.g. an image)
Resource.prototype.renderString = function renderString(req){
	return this.route.renderString(this, req);
}

// Generate a Uint8Array of the resource
Resource.prototype.renderBytes = function renderBytes(){
	throw new Error('renderBytes: unimplemented');
}

Resource.prototype.methods = ['GET', 'HEAD'];

// Accept data for evaluation by this resource
Resource.prototype.post = function post(){
	return Promise.reject(new Error('post: unimplemented'));
}

// Delete this resource from the underlying data store
Resource.prototype.del = function del(){
	return Promise.reject(new Error('reject: unimplemented'));
}

// Modify this resource (according to uploaded instructions)
Resource.prototype.patch = function patch(){
	return Promise.reject(new Error('patch: unimplemented'));
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

// A StringResource is a resource that natively produces a Headers object with `body` property
// So, each of the render/renderString/renderBytes are defined in terms of that.
exports.StringResource = StringResource;
inherits(StringResource, Resource);
function StringResource(){
	Resource.apply(this, arguments);
}
StringResource.prototype.render = function render(req){
	// a StringResource is one that resolves to a Headers or Message object
	// with a body property of the message body
	var downstream = new PassThrough;
	this.renderString(this, req).then(function(upstream){
		upstream.pipeHeaders(downstream);
		downstream.end(upstream.body);
	});
	return downstream;
}
StringResource.prototype.renderBytes = function renderBytes(req){
	return this.renderString(this, req).then(function(){

	});
}
