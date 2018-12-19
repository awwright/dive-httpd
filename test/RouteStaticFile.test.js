
var assert = require('assert');
var lib = require('../index.js');

describe('RouteStaticFile', function(){
	var route;
	before(function(){
		route = new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.html", 'text/html');
	});
	it('#listing', function(){
		return route.listing().then(function(listing){
			console.log(listing);
			assert(listing.files.length);
			assert(listing.dirs.length);
			return Promise.resolve();
		});
	});
});
