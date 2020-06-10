"use strict";
const assert = require('assert');

const pr = require('util').promisify;
const fork = pr(require('child_process').execFile);

describe("dive-httpd CLI", function(){
	it('no arguments help', async function(){
		const sub = await fork('node', [__dirname+'/../bin/dive-httpd.js'], {});
		assert(sub.stdout.toString().match(/Usage:/));
	});
	it('--help help', async function(){
		const sub = await fork('node', [__dirname+'/../bin/dive-httpd.js', '--help'], {});
		assert(sub.stdout.toString().match(/Usage:/));
	});
	it('app.conf', async function(){
		const sub = await fork('node', [__dirname+'/../bin/dive-httpd.js', __dirname+'/cli-data/app.conf'], {});
		assert(sub.stdout.toString().match(/^Success$/m));
	});
	it('--list-routes app.conf', async function(){
		const sub = await fork('node', [__dirname+'/../bin/dive-httpd.js', '--list-routes', __dirname+'/cli-data/app.conf'], {});
		assert(sub.stdout.toString().match(/digraph/i));
	});
});
