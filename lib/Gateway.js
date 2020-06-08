"use strict";

// Gateway: Route a request to another HTTP server

var http = require('http');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;
var StreamResource = require('./Resource.js').StreamResource;
var PassThrough = require('http-transform').PassThrough;

module.exports.Gateway = Gateway;

inherits(Gateway, Route);
function Gateway(opts){
	if(!(this instanceof Gateway)) return new Gateway(opts);
	if(!opts) opts = {};
	this.uriTemplate = opts.uriTemplate;
	this.pool = new http.Agent({
		keepAlive: true,
	});
	// remoteHost and remotePort can override which server to connect to,
	// e.g. a proxy.
	this.remoteHost = opts.remoteHost;
	this.remotePort = opts.remotePort;
	// TODO add a `this.remoteSocket` option to send requests to a file descriptor or file socket
	// this.remoteResourceTemplate = opts.remoteResourceTemplate;
	this.label = 'Gateway';
	this.name = this.label;
}

Gateway.prototype.prepare = function prepare(uri){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	return Promise.resolve(new StreamResource(this, {match, methods:null}));
};

Gateway.prototype.render = function render(resource, req){
	var self = this;
	// var remoteResourceTemplate = this.remoteResource || this.uriTemplate;
	// var requestRoute = match.rewrite(remoteResourceTemplate);
	// console.error(req.method+' '+resource.uri+' via '+self.remoteHost+':'+self.remotePort);
	var res = new PassThrough;
	var downstreamRequest = http.request({
		host: self.remoteHost,
		port: self.remotePort,
		method: req.method,
		path: resource.uri, // What Node.js calls the "path" is actually the request-URI
		headers: req.headers,
	});
	if(req.payload){
		req.payload.render().pipe(downstreamRequest);
	}else{
		downstreamRequest.deleteHeader('Content-Length');
		downstreamRequest.deleteHeader('Transfer-Encoding');
		downstreamRequest.end();
	}
	downstreamRequest.once('response', function(inboundResponse){
		// FIXME use http-transform to pipe headers too
		res.statusCode = inboundResponse.statusCode;
		res.statusMessage = inboundResponse.statusMessage;
		for(var i=0; i<inboundResponse.rawHeaders.length; i+=2){
			const n = inboundResponse.rawHeaders[i];
			const v = inboundResponse.rawHeaders[i+1];
			const w = res.getHeader(n);
			if(w === undefined) res.setHeader(n, v);
			else if(typeof w === 'string') res.setHeader(n, [w, v] );
			else res.setHeader(n, w.concat([v]) );
		}
		inboundResponse.pipe(res);
	});
	return res;
};

Gateway.prototype.post = Gateway.prototype.render;
Gateway.prototype.del = Gateway.prototype.render;
Gateway.prototype.patch = Gateway.prototype.render;

// Call the provided function whenever a resource in the set changes
Gateway.prototype.watch = function watch(){
	// TODO: send an CONNECT or Upgrade request to server or something
	// Or allow user to specify a server- or media-type-specific method of receiving updates, depending on protocol
	return Promise.resolve();
};

// List all the URIs accessible through this route
Gateway.prototype.listing = function listing(){
	// TODO: send an OPTIONS request to server or something
	// Or allow user to specify a server- or media-type-specific method of crawling resources
	return Promise.resolve([]);
};

// This will be a PUT request
Gateway.prototype.store = function store(uri, request){
	return Promise.reject();
};

Gateway.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
};
