"use strict";
/* eslint no-console: 0 */

const httplib = require('http');
const child = require('child_process');
const {
	Application,
	Cache,
	Gateway,
	HTTPServer,
} = require('dive-httpd');

const filterTest = process.argv[2] || '';

// 1. Start the test server
var serverPort, serverProcess, serverWaiting=true;
function startServer(){
	serverProcess = child.execFile(process.execPath, [__dirname+'/../vendor/cache-tests/server.js'], {
		cwd: __dirname+'/../vendor/cache-tests',
		env: {
			npm_config_protocol: 'http',
			npm_config_port: 0,
		},
	});
	var out = '';
	(function readSome(){
		for(var data; null !== (data = serverProcess.stdout.read());){
			out += data;
			const m = out.match(/^Listening on http:\/\/\[::\]:(\d+)\/$/m);
			if(m){
				serverPort = parseInt(m[1]);
				console.log('server: listening on '+serverPort);
				if(filterTest) serverProcess.stdout.pipe(process.stdout);
				else serverProcess.stdout.on('readable', spin);
				return void startCache();
			}
		}
		serverProcess.stderr.pipe(process.stderr);
		serverProcess.stdout.once('readable', readSome);
	})();
	function spin(){
		while(serverProcess.stdout.read());
		if(serverWaiting) process.stdout.write('.');
	}
	serverProcess.on('close', function(){
		serverWaiting = false;
		if(serverPort!==null){
			throw new Error('Connection closed early');
		}
	});
}

// 2. Start the cache
var cacheListener, cachePort;
function startCache(){
	// serverProcess.stdout.pipe(process.stdout);
	// serverProcess.stderr.pipe(process.stderr);
	const app = new Application;
	app.fixedScheme = 'http';
	app.fixedAuthority = 'localhost';
	app.relaxedHost = true;
	app.addRoute(new Cache({
		data: __dirname + '/.cache',
	}, new Gateway({
		uriTemplate: 'http://localhost/{+path}',
		remoteHost: 'localhost',
		remotePort: serverPort,
	})));
	// app.onError = function handleError(req, res, err){
	// 	console.log('Error:', err);
	// };

	const server = new HTTPServer(app);
	cacheListener = httplib.createServer(server.callback());
	cacheListener.listen(0);
	cachePort = cacheListener.address().port;
	console.log('cache: Listening on port '+cachePort);
	app.initialize().then(function(){
		getTests();
	});
}

// 3. Run the tests
const resultTypes = {
	untested: ['-', '', '-'],
	pass: ['\uf058', '#1aa123', '✅'],
	fail: ['\uf057', '#c33131', '⛔️'],
	optional_fail: ['\uf05a', '#bbbd15', '💔'],
	yes: ['\uf055', '#999696', '+'],
	no: ['\uf056', '#999696', '-'],
	setup_fail: ['\uf059', '#4c61ae', '🔹'],
	harness_fail: ['\uf06a', '#4c61ae', '⁉️'],
	dependency_fail: ['\uf192', '#b4b2b2', '⚪️'],
};

function getIcon(test, result){
	if (result === undefined) {
		return resultTypes.untested;
	}
	if (result[0] === 'Setup') {
		return resultTypes.setup_fail;
	}
	if (result === false && result[0] !== 'Assertion') {
		return resultTypes.harness_fail;
	}
	if (test.kind === 'required' || test.kind === undefined) {
		return result===true ? resultTypes.pass : resultTypes.fail;
	} else if (test.kind === 'optimal') {
		return result===true ? resultTypes.pass : resultTypes.optional_fail;
	} else if (test.kind === 'check') {
		return result===true ? resultTypes.yes : resultTypes.no;
	} else {
		throw new Error(`Unrecognised test kind ${test.kind}`);
	}
}

var testData = {};
function getTests(){
	const listProcess = child.execFile(process.execPath, ['--experimental-modules', '--no-warnings', __dirname+'/../vendor/cache-tests/export.mjs'], {
		encoding:'utf-8',
		cwd: __dirname+'/../vendor/cache-tests',
		env: {
		},
	});
	var testJson = '';
	function readSome(){
		for(var data; null !== (data = listProcess.stdout.read());){
			testJson += data;
		}
	}
	listProcess.stderr.pipe(process.stderr);
	listProcess.stdout.on('readable', readSome);
	listProcess.on('close', function(){
		const suites = JSON.parse(testJson);
		suites.forEach(function(suite){
			suite.tests.forEach(function(testDescription){
				testData[testDescription.id] = testDescription;
			});
		});
		startTest();
	});
}

function startTest(){
	serverWaiting = false;
	console.log('Running tests...');
	const testProcess = child.execFile(process.execPath, ['--experimental-modules', '--no-warnings', __dirname+'/../vendor/cache-tests/cli.mjs'], {
		encoding:'utf-8',
		cwd: __dirname+'/../vendor/cache-tests',
		env: {
			npm_package_config_id: filterTest,
			npm_config_base: 'http://localhost:'+cachePort,
		},
	});
	var testJson = '';
	function readSome(){
		for(var data; null !== (data = testProcess.stdout.read());){
			testJson += data;
		}
	}

	testProcess.stderr.pipe(process.stderr);
	if(filterTest) testProcess.stdout.pipe(process.stdout);
	else testProcess.stdout.on('readable', readSome);
	// testProcess.stdout.pipe(process.stdout);

	testProcess.on('close', function(){
		console.error('Test runner closed ['+testProcess.exitCode+']');
		cacheListener.close();
		serverProcess.kill('SIGTERM');
		serverPort = null;
		if(filterTest) return;
		const testResults = JSON.parse(testJson);
		var count = {};
		for(var k in testResults){
			// console.log(k, testData[k], testResults[k]);
			const icon = getIcon(testData[k], testResults[k])[2];
			count[icon] = (typeof count[icon]==='number') ? count[icon]+1 : 1 ;
			if(testResults[k][1]) console.log(icon + ' ' + k + ': '+ testResults[k][1]);
			else console.log(icon + ' ' + k);
		}
		console.log('');
		console.log('─Totals─');
		for(var icon in count){
			console.log(icon, count[icon]);
		}
	});
}

startServer();
