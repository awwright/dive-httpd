"use strict";
const assert = require('assert');

const {
	Application,
	Cache,
	Gateway,
} = require('../../index.js');

const app = module.exports = new Application;

assert(Application);
assert(Cache);
assert(Gateway);

console.log("Success");

