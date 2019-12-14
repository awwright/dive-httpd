"use strict";
var assert = require('assert');
var lib = require('../../dive-httpd/index.js');


describe('Meta: Tests exist', function(){
	it('Route', function(){
		var root = this.test.parent.parent;
		var methodList = [
			'label', 'prepare', 'error', 'watch', 'listing', 'listing renderString', 'store',
			'listDependents',
		];
		var interfaceList = [];
		for(var k in lib) if(lib[k] && lib[k].prototype && lib[k].prototype instanceof lib.Route) interfaceList.push(k);

		assert(methodList.length);
		assert(interfaceList.length);
		interfaceList.forEach(function(interfaceName){
			if(interfaceName==='RouteFilesystem') return;
			methodList.forEach(function(methodName){
				var expectedTestName = interfaceName+'#'+methodName;
				function testTest(test){
					return test.title.substring(0, expectedTestName.length)===expectedTestName;
				}
				function testSuite(suite){
					return suite.tests.some(testTest) || suite.suites.some(testSuite);
				}
				if(!testSuite(root)){
					throw new Error('Expected test for '+expectedTestName);
				}
			});
		});
	});
});
