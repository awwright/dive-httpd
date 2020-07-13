"use strict";
const assert = require('assert');

const pr = require('util').promisify;
const fork = pr(require('child_process').execFile);

describe("dive-httpd CLI", function(){
	it('no arguments help', async function(){
		// resolve
		const { stdout, stderr } = await fork('node', [__dirname+'/../bin/dive-httpd.js'], {});
		assert.match(stdout.toString(), /Usage:/);
		assert.strictEqual(stderr.toString(), '');
	});
	it('invalid argument errors', async function(){
		// resolve
		const res = fork('node', [__dirname+'/../bin/dive-httpd.js', 'does-not-exist.js'], {});
		await assert.rejects(res, function(error){
			assert.strictEqual(error.code, 1);
			assert.match(error.stderr, /ENOENT/);
			assert.match(error.stderr, /does-not-exist\.js/);
			return true;
		});
	});
	it('--help help', async function(){
		const p = fork('node', [__dirname+'/../bin/dive-httpd.js', '--help'], {});
		const child = p.child;
		const { stdout, stderr } = await p;
		assert.strictEqual(child.exitCode, 0);
		assert.match(stdout.toString(), /Usage:/);
		assert.strictEqual(stderr.toString(), '');
	});
	it('app.conf', async function(){
		const p = fork('node', [__dirname+'/../bin/dive-httpd.js', __dirname+'/cli-data/app.conf'], {});
		const child = p.child;
		const { stdout, stderr } = await p;
		assert.strictEqual(child.exitCode, 0);
		assert.match(stdout.toString(), /^Success$/m);
		assert.strictEqual(stderr.toString(), '');
	});
	it('--list-resources app.conf', async function(){
		const p = fork('node', [__dirname+'/../bin/dive-httpd.js', '--list-resources', __dirname+'/cli-data/app.conf'], {});
		const child = p.child;
		const { stdout, stderr } = await p;
		assert.strictEqual(child.exitCode, 0);
		assert.match(stdout.toString(), /http:\/\/localhost\/app\.js/i);
		assert.strictEqual(stderr.toString(), '');
	});
	it('--list-routes app.conf', async function(){
		const p = fork('node', [__dirname+'/../bin/dive-httpd.js', '--list-routes', __dirname+'/cli-data/app.conf'], {});
		const child = p.child;
		const { stdout, stderr } = await p;
		assert.strictEqual(child.exitCode, 0);
		assert.match(stdout.toString(), /digraph/i);
		assert.strictEqual(stderr.toString(), '');
	});
});
