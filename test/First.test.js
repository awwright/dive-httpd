
var assert = require('assert');
var lib = require('../index.js');

describe('First', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.First([
				new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.html", 'text/html'),
				new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.xhtml", 'application/xhtml+xml'),
				new lib.RouteStaticFile(__dirname+'/RouteStaticFile-data', "{/path*}.txt", 'text/plain'),
			]);
		});
		it('First#name');
		it('First#prepare');
		it('First#watch');
		it('First#listing', function(){
			return route.listing().then(function(listing){
				// console.log(listing);
				assert(listing.length);
			});
		});
		it('First#store');
	});
});
