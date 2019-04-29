
// Gateway: Route a request to another HTTP server

var http = require('http');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

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
	this.remoteResourceTemplate = opts.remoteResourceTemplate;
	this.label = 'Gateway';
	this.name = this.label;
}

// Just forward on whatever we've got
Gateway.prototype.request = function request(req, res, next){
	var self = this;
	var remoteResourceTemplate = this.remoteResource || this.uriTemplate;
	var match = this.matchUri(req.uri);
	if(!match) return next();
	var requestRoute = match.rewrite(remoteResourceTemplate);

	return new Promise(function(resolve, reject){
		// console.error(req.method+' '+requestRoute.uri+' via '+self.remoteHost+':'+self.remotePort);
		var inboundRequest = http.request({
			host: self.remoteHost,
			port: self.remotePort,
			method: req.method,
			path: requestRoute.uri,
			headers: req.headers,
		}, function(inboundResponse){
			inboundResponse.pipe(res);
			inboundResponse.on('end', function(){
				resolve();
			});
		});
		req.pipe(inboundRequest);
	});
}

// Don't respond to prepare requests
Gateway.prototype.prepare = function prepare(){
	return Promise.resolve();
}

// Call the provided function whenever a resource in the set changes
Gateway.prototype.watch = function watch(cb){
	// TODO: send an CONNECT or Upgrade request to server or something
	// Or allow user to specify a server- or media-type-specific method of receiving updates, depending on protocol
	return Promise.resolve([]);
}

// List all the URIs accessible through this route
Gateway.prototype.listing = function listing(){
	// TODO: send an OPTIONS request to server or something
	// Or allow user to specify a server- or media-type-specific method of crawling resources
	return Promise.resolve([]);
}

// This will be a PUT request
Gateway.prototype.store = function store(uri, request){
	return Promise.reject();
}

Gateway.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
}
