"use strict";

const assert = require('assert');
const errors = require('../lib/Error.js').errors;

describe('Error', function(){
	it('404 Not Found', function(){
		var err = new errors.NotFound({uri: 'http://example.com/foo'});
		assert.match(err.toString(), /<http:\/\/example\.com\/foo>/);
	});
});
