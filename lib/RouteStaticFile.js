var fs = require('fs');
var TemplateRouter = require('uri-template-router');
var inherits = require('./tk.js').inherits;
var Processor = require('./tk.js').Processor;
var PassThrough = require('./PassThrough.js').PassThrough;

inherits(RouteStaticFile, Processor);
module.exports.RouteStaticFile = RouteStaticFile;
function RouteStaticFile(base, path, ct){
	if(!(this instanceof RouteStaticFile)) return new RouteStaticFile(base, path, ct);
	this.base = base;
	this.path = new TemplateRouter.Route(path);
	this.contentType = ct;
	// And store an object that can generate the variables from a relative path too
	this.pathResolve = new TemplateRouter.Router();
	this.pathResolve.addTemplate(this.path);
}
RouteStaticFile.prototype.process = function process(req, res, route, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.variables into this.
	var path = this.path.gen(route.data);
	if(path.indexOf('..')>=0) throw new Error('..');
	var filepath = this.base + path;
	console.log('Pipe '+filepath);
	var out = new PassThrough;
	out.setHeader('Content-Type', this.contentType);
	return fs.createReadStream(filepath).pipe(out);
};
RouteStaticFile.prototype.index = function index(routes){
	// iterate through all files that match the pattern and return them
	var self = this;
	return fs.readdirSync(this.base).map(function(name){
		var result = self.pathResolve.resolveURI(name);
		if(!result) return;
		return result.data;
	}).filter(function(v){ return !!v; });
};
RouteStaticFile.prototype.pipe = function pipe(){
	return new Pipe(this, transform);
};
