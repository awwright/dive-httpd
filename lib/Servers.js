"use strict";

var inherits = require('util').inherits;
var http = require('http');
var errors = require('./Error.js').errors;

var Servers = module.exports.Servers = {};

module.exports.Listen = Listen;
function Listen(){
}
Listen.prototype.callback = function callback(){
	return this.handleRequest.bind(this);
};

exports.getEffectiveURI = getEffectiveURI;
function getEffectiveURI(app, req){
	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	// 1. The request-target can be in one of four forms:
	// request-target = origin-form / absolute-form  / authority-form / asterisk-form
	// 2. If using absolute-form, relax Host header requirements
	// 3. The scheme, authority, and or can be "fixed": always set to the same value (or removed)
	// HTTP/1.1 has no way of determining scheme, so we must fix the scheme,
	// default to "http" if none is provided.

	var hasHost = false;
	for(var i=0; i<req.rawHeaders.length; i+=2){
		if(req.rawHeaders[i].toLowerCase()==='host'){
			if(hasHost){
				throw new errors.ClientError('Multiple Host headers');
			}else{
				hasHost = true;
			}
		}
	}
	if(!hasHost && !app.relaxedHost){
		throw new errors.ClientError('Host header is required');
	}

	// If the server's configuration (or outbound gateway) provides a fixed URI authority component,
	// that authority is used for the effective request URI.
	const fixedScheme = app.fixedScheme;
	const defaultScheme = fixedScheme || app.defaultScheme || 'http';
	const fixedAuthority = app.fixedAuthority;
	const defaultAuthority = fixedAuthority || app.defaultAuthority || 'localhost';
	// const fixedPort = app.fixedPort;
	// const defaultPort = app.defaultPort;
	const host = fixedAuthority || req.headers['host'];

	// if a Host header field is supplied with a non-empty field-value,
	// the authority component is the same as the Host field-value
	if(host){
		// TODO verify the Host against the whole ABNF and write tests
		if(host.indexOf(' ')>=0 || host.indexOf('/')>=0 || host.indexOf('_')>=0){
			throw new errors.ClientError('Invalid Host');
		}
		if(req.url[0]=='/'){
			// origin-form
			// TODO verify req.url syntax
			return defaultScheme + '://' + host + req.url;
		}else if(req.url==='*'){
			// asterisk-form
			// Make the server talk about itself
			return defaultScheme + '://' + host;
		}
	}else{
		// Otherwise, the authority component is assigned the default name configured for the server
		// and, if the connection's incoming TCP port number differs
		// from the default port for the effective request URI's scheme,
		// then a colon (":") and the incoming port number (in decimal form) are appended to the authority component.
		if(req.url[0]=='/'){
			// Host header is optional in HTTP/1.0
			if(req.httpVersion!=='1.0'){
				throw new errors.ClientError('Host header is required');
			}
			// TODO verify req.url syntax
			return defaultScheme + '://' + defaultAuthority + req.url;
		}else if(req.url==='*'){
			// asterisk-form
			// Make the server talk about itself
			return defaultScheme + '://' + defaultAuthority;
		}
	}

	// if the request-target is in authority-form,
	// the effective request URI's authority component is the same as the request-target

	// TODO ensure that the Host header matches the authority

	// Verify that the scheme is correct
	const schemeMatch = req.url.match(/^([A-Za-z][0-9A-Za-z+\-.]*):/);
	if(!schemeMatch){
		throw new errors.ClientError('Invalid request-URI scheme');
	}

	// Verify the URI is correctly formed
	const uriMatch = req.url.substring(schemeMatch[0].length).match(/^(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?$/);
	if(!uriMatch){
		throw new errors.ClientError('Invalid request URI');
	}

	// If fixedAuthority is null , let effectiveAuthority be null
	// If fixedAuthority is a string, use that string
	// If fixedAuthority is undefined, use uriMatch[5]
	const effectiveScheme = fixedScheme || schemeMatch[1];
	const effectiveAuthority = (typeof fixedAuthority=='string' || fixedAuthority===null) ? fixedAuthority : uriMatch[2];

	return effectiveScheme + ':' + (typeof effectiveAuthority==='string' ? '//'+effectiveAuthority : '') + uriMatch[3];
}

function getStream(req){
	function renderPayloadResource(){
		// return new RequestPayloadResource(renderRequestPayload, {
		// contentType: req.headers['content-type'],
		// });
		return req;
	}
	// See RFC7230 Section 3.3.3. Message Body Length
	// (1) is not applicable to requests
	// 2. CONNECT method
	if(req.method==='CONNECT'){
		// CONNECT becomes a tunnel after the request, there's no payload
		return;
	}
	// 3. Transfer-Encoding: chunked
	const te = req.headers['transfer-encoding'];
	if(req.headers['transfer-encoding']){
		const teList = (Array.isArray(te) ? te.join(',') : te)
			.split(',')
			.map(function(v){ return v.trim(); });
		if(teList[te.length]==='chunked'){
			return renderPayloadResource();
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
		return renderPayloadResource();
	}
	// 6. This is a request message and none of the above are true, so the length is zero.
	// If there's a Content-Type, treat it as a zero-length document
	if(req.headers['content-type']){
		return renderPayloadResource();
	}
	// Otherwise, assume no payload document.
	return;
}

Servers["http"] = HTTPServer;
module.exports.HTTPServer = HTTPServer;
inherits(HTTPServer, Listen);
function HTTPServer(app, args, config){
	if(!args) args = {};
	if(!config) config = {};
	this.app = app;
	if(!app) throw new Error('Expected argument `app`');
	var configPort = args.httpPort || process.env.PORT || config.port;
	if(typeof configPort==='string') configPort = parseInt(configPort, 10);
	this.configPort = configPort;
	this.configAddr = args.httpAddr || config.addr || '127.0.0.1';
}
HTTPServer.prototype.handleRequest = function handleRequest(req, res){
	var app = this.app;
	try {
		var uri = getEffectiveURI(app, req);
	}catch(err){
		res.statusCode = 400;
		app.error('*', err).then(function(resource){
			if(resource){
				resource.render(req).pipe(res);
			}else{
				app.writeError(req, res, err);
			}
		}).catch(function fail(err){
			app.writeError(req, res, err);
		});
		return;
	}

	const request = {
		method: req.method,
		httpVersion: req.httpVersion,
		uri: uri,
		headers: req.headers,
		rawHeaders: req.rawHeaders,
		stream: getStream(req),
	};
	app.handleRequest(request, res);
};
HTTPServer.prototype.open = function open(){
	var server = http.createServer(this.callback());
	server.listen(this.configPort || 8080, this.configAddr);
	return Promise.resolve();
};
