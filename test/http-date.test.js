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
	it('compare year', function(){
		assert.equal(compare('Tue, 15 Nov 1994 08:12:31 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Tue, 15 Nov 1994 08:12:31 GMT'), true);
	});
	it('compare month', function(){
		assert.equal(compare('Wed, 15 Dec 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Wed, 15 Dec 1993 08:12:32 GMT'), true);
	});
	it('compare day', function(){
		assert.equal(compare('Tue, 16 Nov 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Tue, 16 Nov 1993 08:12:32 GMT'), true);
	});
	it('compare hour', function(){
		assert.equal(compare('Mon, 15 Nov 1993 09:12:32 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 09:12:32 GMT'), true);
	});
	it('compare minute', function(){
		assert.equal(compare('Mon, 15 Nov 1993 08:13:32 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 08:13:32 GMT'), true);
	});
	it('compare second', function(){
		assert.equal(compare('Mon, 15 Nov 1993 08:12:33 GMT', 'Mon, 15 Nov 1993 08:12:32 GMT'), false);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 08:12:33 GMT'), true);
	});
	it('compare RFC850 form', function(){
		assert.equal(compare('Sun, 06 Nov 1994 08:49:37 GMT', 'Sunday, 06-Nov-94 08:49:37 GMT'), false);
		assert.equal(compare('Sun, 06 Nov 1994 08:49:37 GMT', 'Sunday, 06-Nov-94 08:49:38 GMT'), true);
	});
	it('compare RFC850 form 2', function(){
		assert.equal(compare('Sun, 06 Nov 2033 08:49:37 GMT', 'Sunday, 06-Nov-33 08:49:37 GMT'), false);
		assert.equal(compare('Sun, 06 Nov 2033 08:49:37 GMT', 'Sunday, 06-Nov-33 08:49:38 GMT'), true);
	});
	it('compare asctime form', function(){
		assert.equal(compare('Sun, 06 Nov 1994 08:49:37 GMT', 'Sun Nov  6 08:49:37 1994'), false);
		assert.equal(compare('Sun, 06 Nov 1994 08:49:37 GMT', 'Sun Nov  6 08:49:38 1994'), true);
	});
	it('compare invalid date', function(){
		assert.equal(compare('Mon, 15 Nov 1993 08:12:33 GMT', 'Mon, 15 Nov 1993 08:12:32 UTC'), null);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 GMT', 'Mon, 15 Nov 1993 08:12:33 UTC'), null);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:33 UTC', 'Mon, 15 Nov 1993 08:12:32 GMT'), null);
		assert.equal(compare('Mon, 15 Nov 1993 08:12:32 UTC', 'Mon, 15 Nov 1993 08:12:33 GMT'), null);
	});
});
