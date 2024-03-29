"use strict";
module.exports = {
	"ignorePatterns": ["reports", "vendor"],
	"env": {
		"mocha": true,
		"es6": true,
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"ecmaVersion": 11,
	},
	"rules": {
		"indent": [ "error", "tab", { SwitchCase: 1 } ],
		"strict": ["error", "global"],
		"no-unused-vars": [ "warn" ],
		"no-unreachable": [ "warn" ],
		"linebreak-style": [  "error", "unix" ],
		"semi": [ "error", "always" ],
		"no-extra-semi": [ "error" ],
		"comma-dangle": [ "error", "always-multiline" ],
		"no-console": [ "warn" ],
	},
};
