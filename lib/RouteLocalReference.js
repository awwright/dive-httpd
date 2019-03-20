var TemplateRouter = require('uri-template-router');
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

inherits(RouteLocalReference, Route);
module.exports.RouteLocalReference = RouteLocalReference;
function RouteLocalReference(router, target){
	if(!(this instanceof RouteLocalReference)) return new RouteLocalReference(router, target);
	if(typeof router !== 'object') throw new Error('Expected arguments[0] `router` to be an object');
	if(!(router instanceof TemplateRouter.Router)) throw new Error('Expected arguments[0] `router` to be instanceof Router');
	if(typeof target !== 'string') throw new Error('Expected arguments[1] `target` to be a string');
	this.router = router;
	this.target = new TemplateRouter.Route(target);
	Route.call(this);
	this.name = 'RouteLocalReference('+target+')';
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
RouteLocalReference.prototype.listing = function listing(){
	var self = this;
	// return an array of values that would fill variables in `this.target`
	//console.log(this.target);
	return Promise.all(self.router.routes.filter(function(route){
		// TODO do a better match than just an exact match
		// I don't even know if that's possible though
		return self.target.template===route.template;
	}).map(function(route){
		return route.name.listing();
	})).then(function(routes){
		var values = [];
		routes.forEach(function(routes){
			routes.forEach(function(rsc){
				values.push(rsc);
			});
		});
		return Promise.resolve(values);
	});
};
