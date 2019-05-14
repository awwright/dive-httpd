"use strict";

var inherits = require('util').inherits;
var http = require('http');

var Servers = module.exports.Servers = {};

module.exports.Listen = Listen;
function Listen(){
}
Listen.prototype.callback = function callback(){
	return this.handleRequest.bind(this);
}

Servers["http"] = HTTPServer;
module.exports.HTTPServer = HTTPServer;
inherits(HTTPServer, Listen);
function HTTPServer(app, args, config){
	if(!args) args = {};
	if(!config) config = {};
	this.app = app;
	this.configPort = args.httpPort || process.env.PORT || config.port;
	if(typeof configPort==='string') configPort = parseInt(configPort, 10);
	this.configAddr = args.httpAddr || config.addr || '127.0.0.1';
}
HTTPServer.prototype.handleRequest = function handleRequest(req, res){
	var app = this.app;
	var fixedScheme = app.fixedScheme || 'http';
	var fixedAuthority = app.fixedAuthority;
	var host = fixedAuthority || req.headers['host'];
	// TODO verify the Host against the whole ABNF and write tests
	if(host.indexOf(' ')>=0 || host.indexOf('/')>=0){
		throw new Error('Invalid Host');
	}

	// Construct effective request URI
	// <https://tools.ietf.org/html/rfc7230#section-5.5>
	// request-target = origin-form / absolute-form  / authority-form / asterisk-form
	if(req.url[0]=='/'){
		// origin-form
		req.uri = fixedScheme+'://'+host+req.url;
	}else if(req.url==='*'){
		// asterisk-form
		// Make the server talk about itself
		req.uri = 'http://'+host;
	}else{
		// absolute-form
		req.uri = req.url;
	}

	app.handleRequest(req, res);
};
HTTPServer.prototype.open = function open(){
	var server = http.createServer(this.callback());
	server.listen(this.configPort || 8080, this.configAddr);
	return Promise.resolve();
}
