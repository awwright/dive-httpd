

module.exports.handleRequest = require('./lib/http.js').handleRequest;
module.exports.First = require('./lib/http.js').First;
module.exports.Processor = require('./lib/http.js').Processor;

module.exports.TemplateRouter = require('uri-template-router');
module.exports.markdown = require( "markdown" ).markdown;

module.exports.RouteNotFound = require('./lib/RouteNotFound.js');
module.exports.RouteStaticFile = require('./lib/RouteStaticFile.js').RouteStaticFile;
module.exports.RouteLocalReference = require('./lib/RouteLocalReference.js').RouteLocalReference;
module.exports.ServerResponseTransform = require('./lib/ServerResponseTransform.js').ServerResponseTransform;
module.exports.PassThrough = require('./lib/PassThrough.js').PassThrough;


