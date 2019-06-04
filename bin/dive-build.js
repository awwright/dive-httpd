"use strict";

const fs = require('fs');
const path = require('path');
const mkdir = require('fs').promises.mkdir;
const dotenv = require('dotenv');

const args = require('commander');
const { PassThrough } = require('stream');

args.usage('[-c app.conf] [options] [targets...]', 'Read <app.conf> and build targets');
// args.option('-c <app.conf>', 'Use task directives from <app.conf>');
args.option('-f <app.js>', 'Import application file from <app.js>');
args.option('--env <file.env>', 'Import environment variables from <file.env> instead of .env');
args.option('--all', 'Build all resources as targets');
args.option('--base <uri>', 'Map files output underneath <uri> into the target dir');
args.option('--target <dir>', 'Write files to <dir> instead of CWD');
// args.option('--watch', 'Hold process open and rebuild changed resources');
// args.option('--clean', 'Delete the targets');
// args.option('-j<n>, --jobs <n>', 'Allow <n> jobs at once');
// args.option('--delete', 'Delete all other resources under the base');
args.option('--n, --pretend, --dry-run', 'Do not actually write files, just print output');
args.option('--types-file <mime.types>', 'Only build resources with the a media type and filename extension listed in the given file');
args.option('--verbose', 'Output a lot of information');
args.parse(process.argv);

var verbose = args.verbose;
var targets = args.args;

if(args.env){
	if(args.verbose) console.log('Import '+args.env);
	dotenv.config({ path: path.resolve(process.cwd(), args.env) });
// }else if(configData.import){
// 	if(args.verbose) console.log('Import '+configData.import);
// 	dotenv.config({ path: path.resolve(configFilepath, configData.import) });
}else{
	if(args.verbose) console.log('Import .env');
	dotenv.config();
}

var appjs = args.F || 'app.js';
if(verbose) console.error('Load application file: '+appjs);
// Q: Why have the file export the Application instance directly?
// ... Why not a function that returns or resolves an Application?
// A: That might be possible, as long as the Application is predictable.
// The Application configuration is not designed to be changed dynamically, and certainly not after initialization-time.
const app = require(path.resolve(appjs));

const argbase = args.base && args.base[args.base.length-1]=='/' ? args.base.substring(0, args.base.length-1) : args.base ;
const defaultBase = (function(){
	if(typeof app.fixedScheme==='string' && typeof app.fixedAuthority==='string'){
		return app.fixedScheme + ':' + (app.fixedAuthority ? '//' : '') + app.fixedAuthority;
	}else{
		return 'http://localhost';
	}
})();
const base = argbase || defaultBase;
if(verbose){
	console.error('base: '+base);
}

var mediaTypesMap = {};
var targetExtensions = new Set;
if(args.typesFile){
	if(verbose) console.error('Read mime.types from '+args.typesFile);
	var typesFileData = fs.readFileSync(args.typesFile, {encoding:'ASCII'});
	typesFileData.split(/\r?\n/g).map(function(line, i){
		if(line.match(/^\s*(#.*)?$/)) return;
		var parse = line.match(/^([^\s]+)\s+(.+)$/);
		if(parse) return parse;
		throw new Error('Could not parse '+args.typesFile+' on line '+i);
	}).forEach(function(line){
		if(!line) return;
		var key = line[1];
		var extensions = line[2].trim().split(/\s+/).map(function(v){ return '.'+v; });
		mediaTypesMap[key] = extensions;
		extensions.forEach(function(n){
			targetExtensions.add(n);
		});
	});
}

function isListedMediaType(mediaType, filename){
	if(!mediaTypesMap) return;
	var ext = path.extname(filename);
	return mediaTypesMap[mediaType] && mediaTypesMap[mediaType].indexOf(ext)>=0;
}

if(!args.all && !targets.length && !targetExtensions.size){
	console.error('No targets specified. Stop.');
	process.exitCode = 2;
	return;
}

app.initialize().then(function(){
	if(verbose) console.log('Data initialized');
	return app.listing();
}).then(function(list){
	return Promise.all(list.map(function(params){
		var uri = typeof params==='string' ? params : app.generateUri(params);
		if(uri.substring(0, base.length)!==base) return;
		var relpath = uri.substring(base.length);
		// Use all files if --all, or any file listed in targets, or any file with an extension in targetExtensions
		if(!args.all && targets.indexOf(relpath)<0 && !targetExtensions.has(path.extname(relpath))) return;
		if(relpath[0]==='/') relpath = relpath.substring(1);
		if(args.target) relpath = args.target + '/' + relpath;
		if(targets.length && targets.indexOf(relpath)<0) return;
		var target = args.target ? args.target + '/' + relpath : relpath;
		var req = {
			url: uri,
			method: 'GET',
			headers: {},
		};
		// console.log(`${uri} -> ${relpath}`);
		return app.prepare(uri).then(function(resource){
			if(!resource){
				if(verbose){
					console.error('Resource listed but not resolved by any route: <'+uri+'>');
				}
				// In theory this should only request resources that are known to exist
				//throw new Error('Not Found: '+item.uri);
				return;
			}
			var response = resource.render(req);
			response.target = target;
			return response.headersReady.then(function(){
				if(args.pretend){
					return;
				}else{
					return mkdir(path.dirname(relpath), {recursive: true});
				}
			}).then(function(){
				if(args.pretend){
					var stream = new PassThrough;
					stream.resume();
				}else{
					var stream = fs.createWriteStream(relpath, {});
				}
				// TODO: ensure that the listed content-type is valid for the given file extension, if desired
				if(!response.hasHeader('Content-Type')){
					if(verbose) console.error(''+relpath+' <'+uri+'> has no Content-Type');
					return;
				}
				if(mediaTypesMap && !isListedMediaType(response.getHeader('Content-Type'), relpath)){
					if(verbose) console.error(''+relpath+' <'+uri+'>: Ignoring file, extension not listed for '+response.getHeader('Content-Type'));
					return;
				}
				if(response.statusCode===null || response.statusCode===200){
					if(args.pretend){
						console.error('Would write '+relpath+' from <'+uri+'>');
					}else{
						console.log(''+relpath+' from <'+uri+'>');
					}
					response.pipeBody(stream);
					return new Promise(function(resolve){
						stream.on('finish', resolve.bind(null, uri));
					});
				}else{
					console.error('Status code '+response.statusCode, uri);
					throw new Error([uri, response.statusCode]);
				}
			});
		});
	}));
}).then(function(list){
	var built = list.filter(function(v){ return !!v; });
	if(verbose) console.log('Built '+built.length+' targets');
}).catch(function(err){
	console.error('finally', err);
});

