

module.exports.HTTPServer = require('./lib/http.js').HTTPServer;
module.exports.handleRequest = require('./lib/http.js').handleRequest;
module.exports.First = require('./lib/http.js').First;
module.exports.Processor = require('./lib/http.js').Processor;

module.exports.TemplateRouter = require('uri-template-router');

module.exports.ServerResponseTransform = require('http-transform').ServerResponseTransform;
module.exports.PassThrough = require('http-transform').PassThrough;

module.exports.Pipe = require('./lib/Route.js').Pipe;
module.exports.Route = require('./lib/Route.js').Route;
module.exports.Resource = require('./lib/Resource.js').Resource;
module.exports.RoutePipeline = require('./lib/RoutePipeline.js').RoutePipeline;

module.exports.RouteNotFound = require('./lib/RouteNotFound.js');
module.exports.RouteError = require('./lib/RouteError.js').RouteError;
module.exports.RouteStaticFile = require('./lib/RouteStaticFile.js').RouteStaticFile;
module.exports.RouteLocalReference = require('./lib/RouteLocalReference.js').RouteLocalReference;
