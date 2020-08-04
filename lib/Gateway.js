"use strict";

// Gateway: Route a request to another HTTP server

var http = require('http');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;
var Resource = require('./Route.js').Resource;
var { ResponsePassThrough } = require('http-transform');
var { errors } = require('./Error.js');

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
	return Promise.resolve(new GatewayResource(this, {match, methods:null}));
};

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

inherits(GatewayResource, Resource);
module.exports.GatewayResource = GatewayResource;
function GatewayResource(route, options){
	Resource.call(this, route, options);
}

GatewayResource.prototype.handle = function handle(req){
	const route = this.route;
	const resource = this;
	// var remoteResourceTemplate = this.remoteResource || this.uriTemplate;
	// var requestRoute = match.rewrite(remoteResourceTemplate);
	// console.error(req.method+' '+resource.uri+' directed to '+self.remoteHost+':'+self.remotePort);
	var res = new ResponsePassThrough;
	const ignoreHeaders = new Set(['connection']);
	if(req.headers['connection']){
		// If multiple Connection headers are provided for some reason,
		// toString() will join the array items together with commas, very convenient
		req.headers['connection'].toString().split(/\s*,\s*/).forEach(function(v){
			if(v) ignoreHeaders.add(v.toLowerCase());
		});
	}
	if(!req.stream){
		// Exclude headers that would signal a request entity-body
		ignoreHeaders.add('content-length');
		ignoreHeaders.add('transfer-encoding');
	}
	var headers = [];
	for(var i=0; i<req.rawHeaders.length; i+=2){
		const n = req.rawHeaders[i];
		const nk = n.toLowerCase();
		if(ignoreHeaders.has(nk)) continue;
		// 99 forwards ought to be enough for anyone...
		if(nk=='max-forwards' && req.rawHeaders[i+1].match(/^[1-9][0-9]?$/)){
			headers.push([n, (req.rawHeaders[i+1]-1).toString()]);
		}else{
			headers.push([n, req.rawHeaders[i+1]]);
		}
	}
	var downstreamRequest = http.request({
		host: route.remoteHost,
		port: route.remotePort,
		method: req.method,
		path: resource.uri, // What Node.js calls the "path" is actually the request-URI
		headers: headers,
	});
	if(req.stream){
		req.stream.pipe(downstreamRequest);
	}else{
		downstreamRequest.end();
	}
	downstreamRequest.once('response', function(inboundResponse){
		// FIXME use http-transform to pipe headers too
		res.statusCode = inboundResponse.statusCode;
		res.statusMessage = inboundResponse.statusMessage;
		const ignoreResponseHeaders = new Set(['connection']);
		if(inboundResponse.headers['connection']){
			// If multiple Connection headers are provided for some reason,
			// toString() will join the array items together with commas, very convenient
			inboundResponse.headers['connection'].toString().split(/\s*,\s*/).forEach(function(v){
				if(v) ignoreResponseHeaders.add(v.toLowerCase());
			});
		}
		for(var i=0; i<inboundResponse.rawHeaders.length; i+=2){
			const n = inboundResponse.rawHeaders[i];
			if(ignoreResponseHeaders.has(n.toLowerCase())) continue;
			const v = inboundResponse.rawHeaders[i+1];
			const w = res.getHeader(n);
			if(w === undefined) res.setHeader(n, v);
			else if(typeof w === 'string') res.setHeader(n, [w, v] );
			else res.setHeader(n, w.concat([v]) );
		}
		inboundResponse.pipe(res);
	});
	downstreamRequest.on('error', function(error){
		if (error.code === 'ECONNRESET') {
			res.destroy(new errors.BadGateway('Connection reset', {error}));
		}else{
			res.destroy(error);
		}
	});
	return res.clientReadableSide;
};
