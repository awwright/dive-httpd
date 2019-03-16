const http = require('http');
const path = require('path');
const opts = require('commander');

const {
	handleRequest,
} = require('./index.js');
global.DiveCore = require('./index.js');

var listenPort = process.env.PORT || 8080;

opts.usage('[options] <app.js>', 'Run an HTTP server for <app.js>');
opts.option('--port <int>', 'Listen on a TCP port number (default: 8080)');
//opts.option('--tls <int>', 'Listen over TLS on a TCP port number (default: 8443)');
opts.option('--sock <path>', 'Listen on a Unix socket interface');
opts.option('--list-resources', 'Enumerate all of the defined routes');
opts.option('--list-routes', 'Enumerate all of the resources that can be served');
opts.parse(process.argv);
if (opts.args.length !== 1) return void opts.help();

const serverOptions = require(path.resolve(opts.args[0]));
const router = serverOptions.routes;

if(opts.listRoutes){
	console.log('Defined routes:');
	router.routes.forEach(function(route){
		console.log('# '+route.name.name, route.template);
	});
}
if(opts.listResources){
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
