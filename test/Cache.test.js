
var assert = require('assert');

var lib = require('../index.js');

describe('Cache', function(){
	describe('interface', function(){
		var route;
		before(function(){
			var source = lib.RouteGenerated('http://example.com/~{user}.txt', {
				contentType: 'text/plain',
				generateBody: function(uri, data){
					if(data.user.length < 4) return;
					return data.user + "\r\n";
				},
				list: [ {user:'root'}, {user:'guest'} ],
			});
			route = new lib.Cache('http://example.com/~{user}', source);
		});
		it('Cache#name', function(){
			assert.strictEqual(route.name, 'RouteGenerated | Cache');
		});
		it('Cache#label', function(){
			assert.strictEqual(route.label, 'Cache');
		});
		it('Cache#prepare (200)');
		it('Cache#prepare (404)');
		it('Cache#error');
		it('Cache#watch');
		it('Cache#listing');
		it('Cache#store');
		it('Cache#listDependents');
	});
});
