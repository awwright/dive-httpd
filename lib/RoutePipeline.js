
var inherits = require('util').inherits;
var Route = require('./Route.js').Route;

module.exports.RoutePipeline = RoutePipeline;

function RoutePipeline(route, target){
	if(!(route instanceof Route)) throw new Error('Expected arguments[0] `route` to be instanceof Route');
	var pipeline = Object.create(route);
	if(!route.name) throw new Error('Missing name');
	if(Array.isArray(target)){
		pipeline.name = 'Pipeline('+route.name+','+target.map(v=>v.name).join(',')+')';
	}else{
		pipeline.name = 'Pipeline('+route.name+','+target.name+')';
	}
	pipeline.prepare = function prepare(){
		return route.prepare.apply(this, arguments).then(function(resource){
			const res = Object.create(resource);
			res.super = resource;
			res.render = function render(){
				if(Array.isArray(target)){
					return target.reduce(function(stream, transform){
						var instance = transform(resource);
						stream.pipe(instance);
						return instance;
					}, resource.render.apply(this, arguments));
				}else{
					return resource.render.apply(this, arguments).pipe(target());
				}
			}
			return Promise.resolve(res);
		});
	}
	return pipeline;
}
