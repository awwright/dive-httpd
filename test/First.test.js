
var assert = require('assert');
var lib = require('../index.js');

describe('First', function(){
	var route;
	before(function(){
		route = lib.First([
			new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.html", 'text/html'),
			new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.xhtml", 'application/xhtml+xml'),
		]);
	});
	it('#listing', function(){
		return route.listing().then(function(listing){
			// console.log(listing);
			assert(listing.length);
			return Promise.resolve();
		});
	});
});
