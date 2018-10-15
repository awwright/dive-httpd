var TemplateRouter = require('uri-template-router');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

inherits(RouteLocalReference, Route);
module.exports.RouteLocalReference = RouteLocalReference;
function RouteLocalReference(target){
	if(!(this instanceof RouteLocalReference)) return new RouteLocalReference(target);
	if(typeof target !== 'string') throw new Error('Expected arguments[0] `target` to be a string');
	this.target = new TemplateRouter.Route(target);
	Route.call(this);
}
RouteLocalReference.prototype.prepare = function prepare(route, euri, queryMap){
	// this.target might have a URI Template expression. Substutite route.data into this.
	var uri = this.target.gen(route.data);
	var upstream = route.router.resolveURI(uri);
	//console.log('RouteLocalReference '+this.target+' -> '+upstream.template);
	if(upstream){
		return upstream.name.prepare(upstream, euri, queryMap);
	}else{
		return Promise.reject(new Error('Could not resolve: '+uri));
	}
};
RouteLocalReference.prototype.index = function index(routes){
	var self = this;
	// return an array of values that would fill variables in `this.target`
	//console.log(this.target);
	var values = [];
	routes.routes.forEach(function(route){
		// TODO don't just do an exact match
		if(self.target.template!==route.template) return;
		route.name.index(routes).forEach(function(rsc){
			values.push(rsc);
		});
	});
	return values;
};
