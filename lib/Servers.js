"use strict";

var inherits = require('util').inherits;
var http = require('http');
var RequestPayloadResource = require('./Resource.js').RequestPayloadResource;
var HTTPPassThrough = require('http-transform').PassThrough;

var Servers = module.exports.Servers = {};

module.exports.Listen = Listen;
function Listen(){
}
Listen.prototype.callback = function callback(){
	return this.handleRequest.bind(this);
}

exports.getEffectiveURI = getEffectiveURI;
function getEffectiveURI(app, req){
	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	// request-target = origin-form / absolute-form  / authority-form / asterisk-form
	// HTTP/1.1 has no way of determining scheme, so we must fix the scheme,
	// default to "http" if none is provided.
	const fixedScheme = app.fixedScheme || 'http';
	const host = app.fixedAuthority || req.headers['host'];
	// TODO verify the Host against the whole ABNF and write tests
	if(host.indexOf(' ')>=0 || host.indexOf('/')>=0 || host.indexOf('_')>=0){
		throw new Error('Invalid Host');
	}
	if(req.url[0]=='/'){
		// origin-form
		return fixedScheme+'://'+host+req.url;
	}else if(req.url==='*'){
		// asterisk-form
		// Make the server talk about itself
		const scheme = fixedScheme || 'http';
		return scheme + '://' + host;
	}else{
		// absolute-form
		return req.url;
	}
}

exports.getPayload = getPayload;
function getPayload(app, req){
	function renderRequestPayload(){
		var stream = new HTTPPassThrough;
		for(var k in req.headers){
			stream.setHeader(k, req.headers[k]);
		}
		req.pipe(stream);
		return stream;
	}
	// See RFC7230 Section 3.3.3. Message Body Length
	// (1) is not applicable to requests
	// 2. CONNECT method
	if(req.method==='CONNECT'){
		// CONNECT becomes a tunnel after the request, there's no payload
		return;
	}
	// 3. Transfer-Encoding: chunked
	if(req.headers['transfer-encoding']){
		const te = req.headers['transfer-encoding'].split(',').map(function(v){
			return v.trim();
		});
		if(te[te.length]==='chunked'){
			return new RequestPayloadResource(renderRequestPayload, {
				contentType: req.headers['content-type'],
			});
		}
	}else{
		// 4. If a message is received without Transfer-Encoding and an invalid Content-Length
		let contentLength = null;
		for(let i=0; i<req.rawHeaders.length; i+=2){
			if(req.rawHeaders[i].toLowerCase()==='content-length'){
				if(contentLength===null){
					contentLength = req.rawHeaders[i+1];
				}else if(contentLength!==req.rawHeaders[i+1]){
					// A repeated and different Content-Length field
					throw new Error();
				}
			}
		}
		// Validate Content-Length value
		// Technically, Content-Length could be folded into a single header,
		// meaning it would have comma-separated values, but what client would do that?
		if(typeof contentLength==='string' && !contentLength.match(/^\d+$/)){
			throw new Error();
		}
		// 5. If a valid Content-Length is present without Transfer-Encoding
		return new RequestPayloadResource(renderRequestPayload, {
			contentType: req.headers['content-type'],
		});
	}
	// 6. This is a request message and none of the above are true, so the length is zero.
	// If there's a Content-Type, treat it as a zero-length document
	// Otherwise, assume no payload document.
	if(req.headers['content-type']){
		return new RequestPayloadResource(renderRequestPayload, {
			contentType: req.headers['content-type'],
		});
	}
	return;
}

Servers["http"] = HTTPServer;
module.exports.HTTPServer = HTTPServer;
inherits(HTTPServer, Listen);
function HTTPServer(app, args, config){
	if(!args) args = {};
	if(!config) config = {};
	this.app = app;
	var configPort = args.httpPort || process.env.PORT || config.port;
	if(typeof configPort==='string') configPort = parseInt(configPort, 10);
	this.configPort = configPort;
	this.configAddr = args.httpAddr || config.addr || '127.0.0.1';
}
HTTPServer.prototype.handleRequest = function handleRequest(req, res){
	var app = this.app;
	var request = {
		method: req.method,
		uri: getEffectiveURI(app, req),
		headers: req.headers,
		rawHeaders: req.rawHeaders,
		payload: getPayload(app, req),
	};
	app.handleRequest(request, res);
};
HTTPServer.prototype.open = function open(){
	var server = http.createServer(this.callback());
	server.listen(this.configPort || 8080, this.configAddr);
	return Promise.resolve();
}
