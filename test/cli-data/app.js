"use strict";
const assert = require('assert');

const {
	Application,
	Cache,
	Gateway,
	RouteFilesystem,
} = require('../../index.js');

const app = module.exports = new Application;

app.addRoute(new RouteFilesystem({
	uriTemplate: 'http://localhost{/path*}.js',
	fileroot: __dirname,
	pathTemplate: "{/path*}.js",
	contentType: 'application/ecmascript',
}));

assert(Application);
assert(Cache);
assert(Gateway);

console.log("Success");

