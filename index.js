
module.exports.HTTPServer = require('./lib/http.js').HTTPServer;
module.exports.handleRequest = require('./lib/http.js').handleRequest;
module.exports.Negotiate = require('./lib/Negotiate.js').Negotiate;
module.exports.First = require('./lib/First.js').First;

module.exports.TemplateRouter = require('uri-template-router');

module.exports.ServerResponseTransform = require('http-transform').ServerResponseTransform;
module.exports.PassThrough = require('http-transform').PassThrough;

module.exports.Resource = require('./lib/Resource.js').Resource;
module.exports.StreamResource = require('./lib/Resource.js').StreamResource;
module.exports.BytesResource = require('./lib/Resource.js').BytesResource;
module.exports.StringResource = require('./lib/Resource.js').StringResource;

module.exports.Route = require('./lib/Route.js').Route;
module.exports.RoutePipeline = require('./lib/RoutePipeline.js').RoutePipeline;
module.exports.RouteGenerated = require('./lib/RouteGenerated.js').RouteGenerated;
module.exports.RouteStaticFile = require('./lib/RouteStaticFile.js').RouteStaticFile;
module.exports.RouteLocalReference = require('./lib/RouteLocalReference.js').RouteLocalReference;

module.exports.RouteNotFound = require('./lib/RouteNotFound.js');
module.exports.RouteError = require('./lib/RouteError.js').RouteError;
