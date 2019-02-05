"use strict";

var fs = require('fs');
var inherits = require('util').inherits;
var chokidar = require('chokidar');
var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;
var PassThrough = require('http-transform').PassThrough;

inherits(RouteStaticFile, Route);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(base, path, ct, options){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(base, path, ct, options);
	if(!options) options = {};
	if(typeof base!=='string') throw new Error('Expected string `base`');
	if(typeof path!=='string') throw new Error('Expected string `path`');
	if(typeof ct!=='string') throw new Error('Expected string `ct`');
	this.base = base;
	this.path = new TemplateRouter.Route(path);
	this.contentType = ct;
	// And store an object that can generate the variables from a relative path too
	this.pathResolve = new TemplateRouter.Router();
	this.pathResolve.addTemplate(this.path);
	this.name = this.name + '(' + base + path + ')';
	// Send a Link header specifying the file the request was read from
	this.filepathLink = false;
	if(typeof options.filepathLink=='boolean') this.filepathLink = options.filepathLink;
	// if fileLink is enabled, this will set the authority of the URI (default blank)
	this.filepathAuthority = '';
	if(typeof options.filepathAuthority=='string') this.filepathAuthority = options.filepathAuthority;
	// if fileLink is enabled, this will set the authority of the URI
	this.filepathRel = 'tag:awwright.github.io,2019:dive-httpd/source';
	if(typeof options.filepathRel=='string') this.filepathRel = options.filepathRel;
	Route.call(this);
}
RouteStaticFile.prototype.name = 'RouteStaticFile';
RouteStaticFile.prototype.resourceType = ResourceStaticFile;
RouteStaticFile.prototype.prepare = function prepare(match, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var self = this;
	if(typeof match!=='object') throw new Error('Expected arguments[0] `match` to be an object');
	var path = self.path.gen(match.data || {});
	if(path.indexOf('/../')>=0) throw new Error('/../');
	var filepath = self.base + path;
	return new Promise(function(resolve, reject){
		var stream = fs.createReadStream(filepath);
		stream.on('error', function(err){
			return void reject({notfound: filepath});
		});
		stream.on('open', function(err){
			var rr = new self.resourceType(self, euri, match, stream);
			return void resolve(rr);
		});
	});
};
RouteStaticFile.prototype.index = function index(routes){
	// iterate through all files that match the pattern and return them
	var self = this;
	var files = [];
	function ls(dir){
		fs.readdirSync(self.base+'/'+dir).forEach(function(filename){
			var filepath = dir+'/'+filename;
			var result = self.pathResolve.resolveURI(filepath);
			if(result && result.data) files.push(result.data);
			if(fs.statSync(self.base+'/'+filepath).isDirectory()) ls(filepath);
		});
	}
	ls('');
	return files;
};
RouteStaticFile.prototype.scanDirectory = function scanDirectory(){
	// iterate through all files that match the pattern and return them
	var self = this;
	return new Promise(function(resolve){
		var scanDir = [''];
		var files = [];
		ls(0);
		function ls(offset){
			var dir = scanDir[offset];
			fs.readdir(self.base+'/'+dir, {withFileTypes:true}, function(err, list){
				list.forEach(function(entry){
					var filepath = dir+'/'+entry.name;
					var result = self.pathResolve.resolveURI(filepath);
					if(entry.isDirectory()) scanDir.push(filepath);
					else if(result && result.data) files.push(result.data);
				});
				if(offset+1 < scanDir.length) ls(offset+1);
				else return void resolve({files:files, dirs:scanDir});
			});
		}
	});
};
RouteStaticFile.prototype.listing = function listing(){
	return this.scanDirectory().then(function(list){
		return list.files;
	});
};
RouteStaticFile.prototype.watch = function watch(handler){
	var self = this;
	// console.log('watch', this.base, self.path);
	if(self.watching){
		return;
	}
	self.watching = [handler];
	var w = chokidar.watch(self.base);
	w.on('all', function(action, filepath, stat){
		if(filepath.substring(0, self.base.length)!==self.base) return;
		filepath = filepath.substring(self.base.length);
		var result = self.pathResolve.resolveURI(filepath);
		if(result && result.data){
			self.watching.forEach(function(cb){
				cb(result.data, filepath);
			});
			// console.log(filepath);
		}
	});
}

inherits(ResourceStaticFile, Resource);
module.exports.ResourceStaticFile = ResourceStaticFile;
function ResourceStaticFile(route, euri, match, stream){
	if(!(this instanceof ResourceStaticFile)) return new ResourceStaticFile(route, euri, match, stream);
	this.route = route;
	this.euri = euri;
	this.match = match;
	this.stream = stream;
}
ResourceStaticFile.prototype.render = function render(req, res, route, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var self = this;
	var out = new PassThrough;
	out.setHeader('Content-Type', self.route.contentType);
	//out.addHeader('Link', 'file://'+this.stream.path);
	// TODO: co9nfigurable options to add different links
	if(this.route.filepathLink){
		// TODO use a utility function to convert from a filepath to a file URI
		var linkHeader = '<file://'+self.route.filepathAuthority+self.stream.path+'>;rel="'+self.route.filepathRel+'"'
		out.setHeader('Link', (out.getHeader('Link') || []).concat([ linkHeader ]));
	}
	return self.stream.pipe(out);
};
