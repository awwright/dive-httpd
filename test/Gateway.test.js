
var assert = require('assert');

var testMessage = require('../../dive-httpd/test/util.js').testMessage;
var lib = require('../../dive-httpd/index.js');

describe('Gateway', function(){
	describe('interface', function(){
		var route;
		beforeEach(function(){
			route = lib.Gateway();
		});
		it('Gateway#label', function(){
			assert.strictEqual(route.label, 'Gateway');
		});
		it('Gateway#prepare');
		it('Gateway#error');
		it('Gateway#watch');
		it('Gateway#listing');
		it('Gateway#store');
		it('Gateway#listDependents', function(){
			assert(route.listDependents().length);
		});
	});
});
