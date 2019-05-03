"use strict";

var http = require('http');

var Servers = module.exports.Servers = {};

Servers["http"] = function ServeHTTP(app, args, config){
	var server = http.createServer(app.handleRequestFactory());
	var configPort = args.httpPort || process.env.PORT || config.port || 8080;
	if(typeof configPort==='string') configPort = parseInt(configPort, 10);
	var configAddr = args.httpAddr || config.addr || '127.0.0.1';
	server.listen(configPort, configAddr);
	return Promise.resolve();
};
