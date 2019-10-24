'use strict';

const assert = require('assert').strict;
const compare = require('../lib/http-date.js').compareHTTPDateSince;

describe('Unit: HTTP-date parsing', function(){
	it('bad form 1', function(){
		assert.equal(compare('Tue, 15 Nnn 1994 08:12:31 GMT', undefined), null);
	});
	it('form 1, earlier', function(){
		assert.equal(compare('Tue, 15 Nov 1994 08:12:31 GMT', new Date(784887150000)), false);
	});
	it('form 1, equal', function(){
		assert.equal(compare('Tue, 15 Nov 1994 08:12:31 GMT', new Date(784887151000)), false);
	});
	it('form 1, later', function(){
		assert.equal(compare('Tue, 15 Nov 1994 08:12:31 GMT', new Date(784887152000)), true);
	});
});
