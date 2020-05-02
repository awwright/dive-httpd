"use strict";

var libfs = require('fs');
var pathNormalize = require('path').normalize;
var inherits = require('util').inherits;
var chokidar = require('chokidar');
var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;
var StreamResource = require('./Resource.js').StreamResource;
var PassThrough = require('http-transform').PassThrough;

inherits(RouteStaticFile, Route);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(options){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(options);
	var pathTemplate;
	if(!options) options = {};
	if(typeof options!=='object') throw new Error('Expected object `options`');
	this.fs = options.fs || libfs;
	this.uriTemplate = options.uriTemplate;
	this.contentType = options.contentType;
	this.fileroot = options.fileroot;
	pathTemplate = options.pathTemplate;
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
	this.sendETag = true;
	if(typeof options.sendETag=='boolean') this.sendETag = options.sendETag;
	Route.call(this);
}
RouteStaticFile.prototype.label = 'RouteStaticFile';
RouteStaticFile.prototype.resourceType = ResourceStaticFile;
RouteStaticFile.prototype.prepare = function prepare(uri){
	const fs = this.fs;
	var match = this.matchUri(uri);
	if(!match) return Promise.resolve();
	// this.target might have a URI Template expression. Substitute route.variables into this.
	var self = this;
	if(!self.fileroot) throw new Error('Expected nonempty string this.fileroot');
	if(typeof match!=='object') throw new Error('Expected arguments[0] `match` to be an object');
	var path = self.pathTemplate.gen(match.data || {});
	if(path.indexOf('/../')>=0) throw new Error('/../');
	// fileroot should end with a / and path should begin with a /
	// normalize the path to remove the double-slash and any .. segments
	var filepath = pathNormalize(self.fileroot + path);

	return new Promise(function(resolve, reject){
		return fs.stat(filepath, function(err, fileStat){
			if(err) return void resolve();
			var rr = new self.resourceType(self, match, fileStat, filepath);
			return void resolve(rr);
		});
	});
};
RouteStaticFile.prototype.prepareFromStat = function prepareFromStat(filename, fileStat, match){
	const route = this;
	if(!match){
		match = route.pathResolve.resolveURI(filename);
		if(!match) return Promise.resolve();
	}
	var uriMatch = match.rewrite(route.uriTemplate);
	// Return the resource without verifying the stream opens
	// If we do also verify the stream opens, this must delay the watch() from resolving
	const filepath = pathNormalize(route.fileroot + '/' + filename);
	return Promise.resolve(new this.resourceType(route, uriMatch, fileStat, filepath));
};
RouteStaticFile.prototype.render = function render(resource){
	// this.target might have a URI Template expression. Substitute route.variables into this.
	const out = new PassThrough;
	const fs = this.fs;
	const filepath = resource.filepath;

	// Check that the file path is inside the supplied fileroot path
	// This does not dereference symlinks, so use those with care
	if(filepath.substring(0, this.fileroot.length) !== this.fileroot){
		throw new Error('File requested is outside fileroot directory');
	}
	const stream = fs.createReadStream(filepath);

	out.setHeader('Content-Type', this.contentType);
	//out.addHeader('Link', 'file://'+this.stream.path);
	// TODO: configurable options to add different links
	if(this.filepathLink){
		// TODO use a utility function to convert from a filepath to a file URI
		var linkHeader = '<file://'+this.filepathAuthority+stream.path+'>;rel="'+this.filepathRel+'"';
		out.setHeader('Link', (out.getHeader('Link') || []).concat([ linkHeader ]));
	}
	stream.on('error', function(err){
		out.statusCode = 500;
	});
	stream.on('open', function(){
		// out.statusCode = out.statusCode || 200;
	});
	return stream.pipe(out);
};
RouteStaticFile.prototype.scanDirectory = function scanDirectory(){
	// iterate through all files that match the pattern and return them
	const self = this;
	const fs = this.fs;
	return new Promise(function(resolve, reject){
		var scanDir = [''];
		var files = [];
		ls(0);
		function ls(offset){
			var dir = scanDir[offset];
			fs.readdir(self.fileroot+'/'+dir, {withFileTypes:true}, function(err, list){
				if(err) return void reject(err);
				list.forEach(function(entry){
					var filepath = dir+'/'+entry.name;
					var result = self.pathResolve.resolveURI(filepath);
					if(entry.isDirectory()) scanDir.push(filepath);
					else if(result && result.data) files.push(result);
				});
				if(offset+1 < scanDir.length) ls(offset+1);
				else return void resolve({files:files, dirs:scanDir});
			});
		}
	});
};
RouteStaticFile.prototype.listing = function listing(){
	const self = this;
	const fs = this.fs;
	return this.scanDirectory().then(function(list){
		return Promise.all(list.files.map(function(match){
			var filepath = self.fileroot + match.uri;
			return fs.promises.stat(filepath).then(function(stat){
				return self.prepareFromStat(match.uri, stat, match);
			});
		}));
	});
};
RouteStaticFile.prototype.watch = function watch(handler){
	var self = this;
	// console.log('watch', this.fileroot, self.path);
	if(self.watching){
		self.watching.push(handler);
		// console.error('Warning: multiple watchers on RouteStaticFile');
		return this.watchingReady;
	}
	self.watching = [handler];
	// TODO aggregate multiple file watchers into a single "watch" process,
	// use URI router to ensure that all matching routes are signaled.
	var w = chokidar.watch(self.fileroot, {persistent:false});
	w.on('all', function(action, filepath, stat){
		if(filepath.substring(0, self.fileroot.length)!==self.fileroot) return;
		filepath = '/' + filepath.substring(self.fileroot.length);
		var result = self.pathResolve.resolveURI(filepath);
		// console.log('watch', self.fileroot, filepath, self.pathTemplate.template, result && result.data);
		if(result && result.data){
			self.watching.forEach(function(cb){
				self.prepareFromStat(filepath, stat).then(function(rsc){
					if(rsc) return cb(rsc, self);
				});
			});
			// console.log(filepath);
		}
	});
	this.watchingReady = new Promise(function(resolve, reject){
		w.on('ready', resolve);
		w.on('error', reject);
	});
	return this.watchingReady;
};

RouteStaticFile.prototype.listDependents = function listDependents(){
	return [ {
		name: 'Filesystem',
		uriTemplate: this.fileroot+this.pathTemplate.uriTemplate,
		contentType: 'application/octet-stream',
	} ];
};

inherits(ResourceStaticFile, StreamResource);
module.exports.ResourceStaticFile = ResourceStaticFile;
function ResourceStaticFile(route, match, fileStat, filepath){
	if(!(this instanceof ResourceStaticFile)) return new ResourceStaticFile(route, match, fileStat, filepath);
	this.route = route;
	this.match = match;
	this.uri = match.uri;
	this.contentType = route.contentType;
	this.params = match.data;
	this.fileStat = fileStat;
	this.filepath = filepath;
	// console.log(route.sendLastModified, fileStat);
	if(route.sendLastModified) this.lastModified = fileStat.mtime;
	if(route.sendETag) this.ETag = 'm' + fileStat.mtimeMs + 's' + fileStat.size + 'i' + fileStat.ino;
}
