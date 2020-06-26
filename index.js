"use strict";

module.exports.Application = require('./lib/Application.js').Application;
module.exports.RouteURITemplate = require('./lib/RouteURITemplate.js').RouteURITemplate;
module.exports.Cache = require('./lib/Cache.js').Cache;
module.exports.Gateway = require('./lib/Gateway.js').Gateway;
module.exports.Negotiate = require('./lib/Negotiate.js').Negotiate;
module.exports.First = require('./lib/First.js').First;

module.exports.TemplateRouter = require('uri-template-router');

module.exports.ResponseTransform = require('http-transform').ResponseTransform;
module.exports.ResponsePassThrough = require('http-transform').ResponsePassThrough;
// Old forms
module.exports.ServerResponseTransform = require('http-transform').ResponseTransform;
module.exports.PassThrough = require('http-transform').ResponsePassThrough;

module.exports.Resource = require('./lib/Resource.js').Resource;
module.exports.ResponseMessage = require('./lib/ResponseMessage.js').ResponseMessage;
module.exports.errors = require('./lib/Error.js').errors;

module.exports.Route = require('./lib/Route.js').Route;
module.exports.RoutePipeline = require('./lib/RoutePipeline.js').RoutePipeline;
module.exports.RouteFilesystem = require('./lib/RouteFilesystem.js').RouteFilesystem; // maybe change the name in the future
module.exports.RouteLocalReference = require('./lib/RouteLocalReference.js').RouteLocalReference;
module.exports.RouteRedirect = require('./lib/RouteRedirect.js').RouteRedirect;
module.exports.RouteSeeOther = require('./lib/RouteRedirect.js').RouteSeeOther;
module.exports.RouteTemporaryRedirect = require('./lib/RouteRedirect.js').RouteTemporaryRedirect;
module.exports.RoutePermanentRedirect = require('./lib/RouteRedirect.js').RoutePermanentRedirect;

module.exports.Servers = require('./lib/Servers.js').Servers;
module.exports.HTTPServer = require('./lib/Servers.js').HTTPServer;
