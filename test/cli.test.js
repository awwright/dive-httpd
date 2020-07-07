"use strict";
const assert = require('assert');
const { doesNotMatch } = require('assert');

// const pr = require('util').promisify;
const fork = require('child_process').execFile;

describe("dive-httpd CLI", function(){
	it('no arguments help', function(done){
		const child = fork('node', [__dirname+'/../bin/dive-httpd.js'], {}, ready);
		function ready(err, stdout, stderr){
			assert.strictEqual(child.exitCode, 0);
			assert.match(stdout.toString(), /Usage:/);
			done();
		}
	});
	it('--help help', function(done){
		const child = fork('node', [__dirname+'/../bin/dive-httpd.js', '--help'], {}, ready);
		function ready(err, stdout, stderr){
			assert.strictEqual(child.exitCode, 0);
			assert.match(stdout.toString(), /Usage:/);
			done();
		}
	});
	it('app.conf', function(done){
		const child = fork('node', [__dirname+'/../bin/dive-httpd.js', __dirname+'/cli-data/app.conf'], {}, ready);
		function ready(err, stdout, stderr){
			assert(!err);
			assert.strictEqual(child.exitCode, 0);
			assert.match(stdout.toString(), /^Success$/m);
			done();
		}
	});
	it('--list-resources app.conf', function(done){
		const child = fork('node', [__dirname+'/../bin/dive-httpd.js', '--list-resources', __dirname+'/cli-data/app.conf'], {}, ready);
		function ready(err, stdout, stderr){
			assert(!err);
			assert.strictEqual(child.exitCode, 0);
			assert.match(stdout.toString(), /digraph/i);
			done();
		}
	});
	it('--list-routes app.conf', function(done){
		const child = fork('node', [__dirname+'/../bin/dive-httpd.js', '--list-routes', __dirname+'/cli-data/app.conf'], {}, ready);
		function ready(err, stdout, stderr){
			assert(!err);
			assert.strictEqual(child.exitCode, 0);
			assert.match(stdout.toString(), /digraph/i);
			done();
		}
	});
});
