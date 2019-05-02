
/* eslint-disable no-console */

const http = require('http');
const path = require('path');
const opts = require('commander');

global.DiveCore = require('./index.js');

var listenPort = process.env.PORT || 8080;

opts.usage('[options] <app.js>', 'Run an HTTP server for <app.js>');
opts.option('--port <int>', 'Listen on a TCP port number (default: 8080)', listenPort);
//opts.option('--tls <int>', 'Listen over TLS on a TCP port number (default: 8443)');
opts.option('--sock <path>', 'Listen on a Unix socket interface');
opts.option('--list-resources', 'Enumerate all of the defined routes');
opts.option('--list-routes', 'Enumerate all of the resources that can be served');
opts.parse(process.argv);
if (opts.args.length !== 1) return void opts.help();

listenPort = opts.port;

const serverOptions = require(path.resolve(opts.args[0]));

if(opts.listRoutes){
	var list = [serverOptions];
	console.log('digraph structs {');
	console.log('\trankdir = LR;');
	console.log('\tnode [shape=record];');
	for(var i=0; i<list.length; i++){
		var item = list[i];
		var nodeCells = [
			(item.label || item.name || '').slice(0, 40),
			item.uriTemplate,
			item.contentType || '*/*',
		].join(' | ').replace(/{/g, '\\{').replace(/}/g, '\\}');
		console.log(`\te${i} [label="${nodeCells}"];`);
		if(!item.listDependents) continue;
		item.listDependents().forEach(function(v){
			var idx = list.indexOf(v);
			if(idx===-1){
				idx = list.length;
				list.push(v);
			}
			console.log(`\te${i} -> e${idx};`);
		});
	}
	// console.log('Defined routes:');
	// router.routes.forEach(function(route){
	// 	console.log(route.template + '\t' + route.name.name);
	// });
	console.log('}');
	// FIXME: Don't open hooks in the first place and let the process end by itself, instead of using process.exit
	process.exit(0);
	return;
}

if(opts.listResources){
	serverOptions.listing().then(function(list){
		list.forEach(function(v){
			if(typeof v==='string') console.log(v);
			else serverOptions.generateUri(v);
		});
	});
	return;
}

serverOptions.onError = function handleError(req, err){
	console.error('Internal Server Error: '+req.method+' '+(req.uri||req.url));
	console.error(err);
}

var server = http.createServer(serverOptions.handleRequestFactory());
server.listen(listenPort);

console.log('Initializing');
serverOptions.onReady.then(function(){
	console.log('Server running at http://127.0.0.1:' + listenPort + '/');
});

//console.log(routes.resolveURI('http://localhost/123.src'));
