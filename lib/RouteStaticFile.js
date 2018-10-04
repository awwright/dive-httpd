var fs = require('fs');
var TemplateRouter = require('uri-template-router');
var inherits = require('./tk.js').inherits;
var Processor = require('./tk.js').Processor;
var Pipe = require('./Pipe.js').Pipe;
var PassThrough = require('./PassThrough.js').PassThrough;
var RouteNotFound = require('./RouteNotFound.js').RouteNotFound;

inherits(RouteStaticFile, Processor);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(base, path, ct){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(base, path, ct);
	if(typeof ct!=='string') throw new Error('Expected string `ct`');
	this.base = base;
	this.path = new TemplateRouter.Route(path);
	this.contentType = ct;
	// And store an object that can generate the variables from a relative path too
	this.pathResolve = new TemplateRouter.Router();
	this.pathResolve.addTemplate(this.path);
}
RouteStaticFile.prototype.process = function process(req, res, route, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var self = this;
	var path = self.path.gen(route.data);
	if(path.indexOf('..')>=0) throw new Error('..');
	var filepath = self.base + path;
	console.log('Pipe '+filepath);
	return new Promise(function(resolve, reject){
		var stream = fs.createReadStream(filepath);
		stream.on('error', function(err){
//			return new RouteNotFound().process().then(function(stream){
//				resolve(stream);
//			});
			return void reject({notfound: filepath});
		});
		stream.on('ready', function(err){
			var out = new PassThrough;
			out.setHeader('Content-Type', self.contentType);
			stream.pipe(out);
			return void resolve(out);
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
			//console.log(dir+'/'+filename, result && result.template, result && result.data);
			if(result && result.data) files.push(result.data);
			if(fs.statSync(self.base+'/'+dir+'/'+filename).isDirectory()) ls(dir+'/'+filename);
		});
	}
	ls('');
	return files;
};
RouteStaticFile.prototype.pipe = function pipe(transform){
	return new Pipe(this, transform);
};
