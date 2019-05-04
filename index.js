"use strict";

module.exports.Application = require('./lib/Application.js').Application;
module.exports.RouteURITemplate = require('./lib/RouteURITemplate.js').RouteURITemplate;
module.exports.handleRequest = require('./lib/http.js').handleRequest;
module.exports.Cache = require('./lib/Cache.js').Cache;
module.exports.Gateway = require('./lib/Gateway.js').Gateway;
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
module.exports.RouteRedirect = require('./lib/RouteRedirect.js').RouteRedirect;
module.exports.RouteSeeOther = require('./lib/RouteRedirect.js').RouteSeeOther;
module.exports.RouteTemporaryRedirect = require('./lib/RouteRedirect.js').RouteTemporaryRedirect;
module.exports.RoutePermanentRedirect = require('./lib/RouteRedirect.js').RoutePermanentRedirect;

module.exports.Servers = require('./lib/Servers.js').Servers;
module.exports.HTTPServer = require('./lib/Servers.js').HTTPServer;
