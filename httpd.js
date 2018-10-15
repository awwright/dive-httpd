const http = require('http');
const path = require('path');
const opts = require('commander');

const {
	Processor,
	RouteNotFound,
	RouteStaticFile,
	RouteLocalReference,
	First,
	handleRequest,
} = require('./index.js');

const {
	ServerResponseTransform,
} = require('http-transform');

var TemplateRouter = require('uri-template-router');
var markdown = require("markdown").markdown;

var listenPort = process.env.PORT || 8080;

opts.usage('[options] <app.js>', 'Run an HTTP server for <app.js>');
opts.option('--port <int>', 'Listen on a TCP port number (default: 8080)');
//opts.option('--tls <int>', 'Listen over TLS on a TCP port number (default: 8443)');
opts.option('--sock <path>', 'Listen on a Unix socket interface');
opts.option('--list', 'Enumerate all of the resources that can be served');
opts.parse(process.argv);
if (opts.args.length !== 1) return void opts.help();

const serverOptions = require(path.resolve(opts.args[0]));
const router = serverOptions.routes;

if(opts.list){
	console.log('Available resources:', serverOptions);
	router.routes.forEach(function(route){
		//console.log('# '+route.template);
		//console.log(route.name.constructor);
		route.name.index(router).forEach(function(rsc){
			console.log('- '+route.gen(rsc));
		});
	});
}

var server = http.createServer(handleRequest.bind(null, serverOptions));
server.listen(listenPort);
console.log('Server running at http://127.0.0.1:' + listenPort + '/');

//console.log(routes.resolveURI('http://localhost/123.src'));
