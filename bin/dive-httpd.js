"use strict";

const fs = require('fs');
const path = require('path');
const opts = require('commander');
const tomlparse = require('toml');
const dotenv = require('dotenv');

opts.usage('[options] <app.conf>', 'Run an HTTP server with configuration file <app.conf>');
opts.option('--app <app.js>', 'Import from listed app.js file');
opts.option('--env <file.env>', 'Import environment variables from <file.env> instead of .env');
opts.option('--http-port <int>', 'Override port number');
opts.option('--http-addr <iface>', 'Override address to listen to');
opts.option('--list-resources', 'Enumerate all of the defined routes and exit');
opts.option('--list-routes', 'Enumerate all of the resources that can be served and exit');
opts.option('--verbose', 'Output a lot of logs');
opts.option('--debug', 'Log all errors to the console and response');
opts.option('--pretend', 'Only show operations, stop short of writing or making modifications');
opts.parse(process.argv);

if(!opts.app && opts.args.length !== 1) return void opts.help();

/*
# an app.conf file looks a little something like this:

# The file that contains the application-level information
app = "app.js"

# packages are searched starting in the directory this file is in
require = "../dive-plugin"

# The application can be configured in one of three ways:
# 1. Read from environment variables
# 2. Automatically import environment variables from .env, if it exists
# 3. Load app configuration from another file
import = "production.env"

# 4. Specify in this file (but no credentials please!)
[env]
SECRET_FILE="secret.key"

# Define a server
[server.http]
port = 8080
fixedScheme = "https"
fixedHost = "example.com"

# Additional servers can be suffixed with a colon
[server.http:name]
port = 80
fixedScheme = "http"
fixedHost = "example.com"

*/

if(opts.args[0]){
	var configFilepath = path.resolve(opts.args[0]);
	var configDirpath = path.dirname(configFilepath);
	var configContent = fs.readFileSync(configFilepath, 'UTF-8');
	var configData = tomlparse.parse(configContent);
}else{
	var configData = {
		app: opts.app,
		server: {
			http: {
				port: 8080,
				fixedScheme: 'http',
				fixedHost: '',
			},
		},
	};
}

if(opts.verbose){
	console.log(configFilepath+':');
	console.log(configData);
}

for (var k in configData.env) {
	process.env[k] = configData.env[k];
}

if(opts.env){
	if(opts.verbose) console.log('Import '+opts.env);
	dotenv.config({ path: path.resolve(process.cwd(), opts.env) });
}else if(configData.import){
	if(opts.verbose) console.log('Import '+configData.import);
	dotenv.config({ path: path.resolve(configFilepath, configData.import) });
}else{
	if(opts.verbose) console.log('Import .env');
	dotenv.config();
}

var serverTypes = {
	'http': require('..').Servers['http'],
};

const packagesValue = configData.require || [];
const packagesList = Array.isArray(packagesValue) ? packagesValue : [packagesValue];
packagesList.forEach(function(name){
	var path = require.resolve(name, {paths:[configDirpath, __dirname]});
	if(opts.verbose) console.log('require '+JSON.stringify(name)+': load '+JSON.stringify(path));
	var mod = require(path);
	if(!mod.Servers) throw new Error('No Servers property found in `'+path+'`');
	for(var k in mod.Servers){
		if(serverTypes[k]) throw new Error('Plugin already defined');
		serverTypes[k] = mod.Servers[k];
	}
});

const appValue = opts.app || path.resolve(path.dirname(configFilepath), configData.app);
const app = require(path.resolve(appValue));

if(opts.listRoutes){
	var list = [app];
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
	// 	console.log(route.template + '\t' + route.matchValue.name);
	// });
	console.log('}');
	// FIXME: Don't open hooks in the first place and let the process end by itself, instead of using process.exit
	return;
}

if(opts.listResources){
	app.listing().then(function(list){
		list.forEach(function(v){
			if(typeof v.uri==='string') console.log(v.uri);
		});
	});
	return;
}

app.onError = function handleError(req, res, err){
	console.error('Internal Server Error: '+req.method+' '+(req.uri||req.url));
	console.error(err);
};

if(opts.verbose) console.log('Initializing');

var listeners = {};

var serverObject = configData.server || {};
Object.keys(serverObject).forEach(function(name){
	if(name==='app') return;
	if(name==='require') return;
	if(name==='config') return;
	if(name==='import') return;
	var config = serverObject[name];
	var type = config.type || name.split(':',1)[0];
	if(opts.verbose) console.log('Initializing '+name);
	if(!(type in serverTypes)) throw new Error('Unknown server type: '+name);
	listeners[name] = new serverTypes[type](app, opts, configData.server[name]);
	listeners[name].open().then(function(){
		if(opts.verbose) console.log('Listening on port '+listeners[name].address().port);
	});
});

app.onError = function(req, res, err){
	console.error('Uncaught error:', err);
};

if(opts.debug){
	app.debug = true;
}

app.initialize().then(function(){
	if(opts.verbose) console.log('App initialized');
});
