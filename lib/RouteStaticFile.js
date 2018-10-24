"use strict";

var fs = require('fs');
var inherits = require('util').inherits;
var TemplateRouter = require('uri-template-router');

var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;
var PassThrough = require('http-transform').PassThrough;

inherits(RouteStaticFile, Route);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(base, path, ct){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(base, path, ct);
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
		stream.on('ready', function(err){
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
			var result = self.pathResolve.resolveURI(dir+'/'+filename);
			if(result && result.data) files.push(result.data);
			if(fs.statSync(self.base+'/'+dir+'/'+filename).isDirectory()) ls(dir+'/'+filename);
		});
	}
	ls('');
	return files;
};

inherits(ResourceStaticFile, Route);
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
	return self.stream.pipe(out);
};
