"use strict";

var fs = require('fs');
var pathNormalize = require('path').normalize;
var inherits = require('util').inherits;
var chokidar = require('chokidar');
var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;
var StreamResource = require('./Resource.js').StreamResource;
var PassThrough = require('http-transform').PassThrough;

inherits(RouteStaticFile, Route);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(options, path, ct, _opt){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(options, path, ct, _opt);
	var pathTemplate;
	if(typeof options==='object'){
		this.routerURITemplate = options.uriTemplate;
		this.contentType = options.contentType;
		this.fileroot = options.fileroot;
		pathTemplate = options.pathTemplate;
	}else if(typeof options==='string'){
		this.routerURITemplate = 'file://localhost/';
		this.contentType = ct;
		this.fileroot = options;
		pathTemplate = path;
		if(typeof _opt==='object') options = _opt;
	}else{
		throw new Error('Expected object `options`');
	}
	if(!options) options = {};
	if(typeof this.fileroot!=='string') throw new Error('Expected string `fileroot`');
	if(typeof pathTemplate!=='string') throw new Error('Expected string `pathTemplate`');
	if(typeof this.contentType!=='string') throw new Error('Expected string `contentType`');
	this.fileroot = pathNormalize(this.fileroot + '/');
	this.pathTemplate = new TemplateRouter.Route(pathTemplate);
	// And store an object that can generate the variables from a relative path too
	this.pathResolve = new TemplateRouter.Router();
	this.pathResolve.addTemplate(this.pathTemplate);
	this.label = this.label + '(' + this.fileroot + pathTemplate + ')';
	this.name = this.label;
	// Send a Link header specifying the file the request was read from
	this.filepathLink = false;
	if(typeof options.filepathLink=='boolean') this.filepathLink = options.filepathLink;
	// if fileLink is enabled, this will set the authority of the URI (default blank)
	this.filepathAuthority = '';
	if(typeof options.filepathAuthority=='string') this.filepathAuthority = options.filepathAuthority;
	// if fileLink is enabled, this will set the authority of the URI
	this.filepathRel = 'tag:awwright.github.io,2019:dive-httpd/source';
	if(typeof options.filepathRel=='string') this.filepathRel = options.filepathRel;
	this.sendLastModified = true;
	if(typeof options.sendLastModified=='boolean') this.sendLastModified = options.sendLastModified;
	Route.call(this);
}
RouteStaticFile.prototype.label = 'RouteStaticFile';
RouteStaticFile.prototype.resourceType = ResourceStaticFile;
RouteStaticFile.prototype.prepare = function prepare(uri, euri, queryMap){
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var self = this;
	if(typeof match!=='object') throw new Error('Expected arguments[0] `match` to be an object');
	var path = self.pathTemplate.gen(match.data || {});
	if(path.indexOf('/../')>=0) throw new Error('/../');
	// fileroot should end with a / and path should begin with a /
	// normalize the path to remove the double-slash and any .. segments
	var filepath = pathNormalize(self.fileroot + path);
	// Check that the file path is inside the supplied fileroot path
	// This does not dereference symlinks, so use those with care
	if(filepath.substring(0, this.fileroot.length) !== this.fileroot){
		throw new Error('File requested is outside fileroot directory');
	}
	return new Promise(function(resolve, reject){
		return fs.stat(filepath, function(err, fileStat){
			if(err) return void resolve();
			var stream = fs.createReadStream(filepath);
			stream.on('error', function(err){
				return void reject(err);
			});
			stream.on('open', function(err){
				var rr = new self.resourceType(self, match, fileStat, stream);
				return void resolve(rr);
			});
		});
	});
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
			fs.readdir(self.fileroot+'/'+dir, {withFileTypes:true}, function(err, list){
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
	// console.log('watch', this.fileroot, self.path);
	if(self.watching){
		// TODO: push to `self.watching`
		return;
	}
	self.watching = [handler];
	// TODO aggregate multiple file watchers into a single "watch" process,
	// use URI router to ensure that all matching routes are signaled.
	var w = chokidar.watch(self.fileroot);
	w.on('all', function(action, filepath, stat){
		if(filepath.substring(0, self.fileroot.length)!==self.fileroot) return;
		filepath = '/' + filepath.substring(self.fileroot.length);
		var result = self.pathResolve.resolveURI(filepath);
		// console.log('watch', self.fileroot, filepath, self.pathTemplate.template, result && result.data);
		if(result && result.data){
			self.watching.forEach(function(cb){
				cb(result.data, filepath);
			});
			// console.log(filepath);
		}
	});
}

RouteStaticFile.prototype.listDependents = function listDependents(){
	return [ {
		name: 'Filesystem',
		routerURITemplate: this.fileroot+this.pathTemplate.template,
		contentType: 'application/octet-stream',
	} ]
}

inherits(ResourceStaticFile, StreamResource);
module.exports.ResourceStaticFile = ResourceStaticFile;
function ResourceStaticFile(route, match, fileStat, stream){
	if(!(this instanceof ResourceStaticFile)) return new ResourceStaticFile(route, match, fileStat, stream);
	this.route = route;
	this.uri = match.uri;
	this.contentType = route.contentType;
	this.params = match.data;
	this.fileStat = fileStat;
	this.stream = stream;
}
ResourceStaticFile.prototype.render = function render(req, res, route, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var self = this;
	var out = new PassThrough;
	out.setHeader('Content-Type', self.route.contentType);
	if(this.route.sendLastModified){
		out.setHeader('Last-Modified', this.fileStat.mtime.toUTCString());
	}
	//out.addHeader('Link', 'file://'+this.stream.path);
	// TODO: configurable options to add different links
	if(this.route.filepathLink){
		// TODO use a utility function to convert from a filepath to a file URI
		var linkHeader = '<file://'+self.route.filepathAuthority+self.stream.path+'>;rel="'+self.route.filepathRel+'"'
		out.setHeader('Link', (out.getHeader('Link') || []).concat([ linkHeader ]));
	}
	return self.stream.pipe(out);
};
