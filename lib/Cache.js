"use strict";

// Keep a list of files named <{uri}.http> and <{uri}.{vary}.http>
// Where {uri} and {vary} are hashes of the URI and Vary-derived caching keys
// 0. Look up <{uri}.http>
// 0. Read HTTP response headers
// 0. If resource has a Vary header, compute secondary caching key and look up <{uri}.{vary}.http>, read headers
// 0. If the resource is expired, then unlink it and report it as a cache miss
// 0. Set headers to response (omit headers with cache metadata)
// 0. Compute and set Content-Length header
// 0. Write response to stream

var inherits = require('util').inherits;
var fs = require('fs');
var crypto = require('crypto');
var Route = require('./Route.js').Route;
var Resource = require('./Resource.js').Resource;

module.exports.Cache = Cache;

inherits(Cache, Route);
function Cache(opts, inbound){
	if(!(this instanceof Cache)) return new Cache(opts, inbound);
	this.uriTemplate = inbound.uriTemplate;
	this.contentType = inbound.contentType;
	this.innerRoute = inbound;
	if(!(this.innerRoute instanceof Route)) throw new Error('Expected `innerRoute` to be instanceof Route');
	if(!this.innerRoute.name) throw new Error('Missing name');
	if(!this.innerRoute.uriTemplate) throw new Error('Expected `innerRoute` to have a uriTemplate');
	this.label = 'Cache';
	this.name = this.innerRoute.name + ' | ' + this.label;
	// pipeline.contentType = target.contentType;
	// filesystem specific stuff, only to be used by the cache* methods
	this.cacheFilepath = opts.cacheFilepath;
	this.noStore = opts.noStore==null ? false : opts.noStore; // Force "no-store" directive: Do not save responses into the cache (might serve from cache)
	this.noCache = opts.noCache==null ? false : opts.noCache; // Force "no-cache" directive: Do not read from cache (might save into cache)
	this.bypass = opts.bypass==null ? false : opts.bypass; // Do not read or write from cache; intended to be a shortcut for removing the cache entirely
	this.onlyCache = opts.onlyCache==null ? false : opts.onlyCache; // Force "only-if-cached": Do not forward, only read from cache, return 504 (Gateway Timeout) if no entry
	this.forwardServerError = opts.forwardServerError==null ? false : opts.forwardServerError; // By default, handle 5xx errors as network errors. If true, forward 5xx errors as if it's our error
}

Cache.prototype.storageRead = function storageRead(key){
	var self = this;
	// Return a stream with the given key
	return new Promise(function(resolve, reject){
		var filepath = self.cacheFilepath+'/'+key+'.http';
		var stream = fs.createReadStream(filepath);
		var headers = [];
		var headerBuf;
		function onReadable(){
			var chunk;
			while (null !== (chunk=stream.read())) {
				if(headerBuf) chunk = Buffer.concat([headerBuf, chunk]);
				let start = 0;
				let lineEnd;
				while((lineEnd = chunk.indexOf("\r\n", start)) >= 0){
					if (lineEnd > start) {
						// console.log('Push header', chunk.slice(start, lineEnd).toString());
						headers.push(chunk.slice(start, lineEnd).toString());
						start = lineEnd+2;
					}else if(lineEnd===start){
						// console.log('Start body');
						stream.removeListener('error', onError);
						stream.removeListener('readable', onReadable);
						stream.unshift(chunk.slice(lineEnd+2));
						return void resolve({headers, stream});
					}
				}
				// still reading the header.
				headerBuf = chunk.slice(start);
			}
		}
		function onError(e){
			if(e.code==='ENOENT') return void resolve();
			reject(e);
		}
		stream.on('readable', onReadable);
		stream.on('error', onError);
	});
}
Cache.prototype.storageWrite = function storageWrite(key){
	// Return a writable stream with the given key
}
Cache.prototype.storageClean = function storageClean(key){
	// Iterate through the cache items and unlink expired ones
}
Cache.prototype.computePrimaryKey = function computePrimaryKey(uri){
	// Iterate through the cache items and unlink expired ones
	var c = crypto.createHash('sha256');
	c.update(uri);
	return c.digest('hex');
}
Cache.prototype.computeSecondaryKey = function computeSecondaryKey(uri, headers){
	// Iterate through the cache items and unlink expired ones
	// TODO normalize header names/values
	var c = crypto.createHash('sha256');
	c.update(uri+"\r\n");
	var keys = Object.keys(headers).map(function(n){ return n.toLowerCase(); }).sort();
	for(var n in keys){
		c.update(headers[n] + "\r\n");
	}
	return c.digest('hex');
}

// Lookup a URI to see if it exists, resolve a resource if so, or else fail
Cache.prototype.prepare = function prepare(uri){
	var self = this;
	var innerRoute = this.innerRoute;
	var match = this.matchUri(uri);
	// First, look in cache to see if we have a "fresh" resource
	var key1 = this.computePrimaryKey(match.uri);
	if(this.bypass){
		return this.innerRoute.prepare.apply(this.innerRoute, arguments);
	}
	return this.storageRead(key1).then(function(hit){
		if(!hit){
			// console.error(`Cache miss ${match.uri} ${key1}`);
			// Cache miss, forward to origin
			return innerRoute.prepare(uri);
		}
		// console.error(`Cache hit`, hit);
		// Read headers
		// Determine if a secondary key must be computed
		// Assume not for now
		// Determine if response is fresh
		// If not fresh, revalidate with inbound
		return new CacheResource(self, hit);
	});
}

// Call the provided function whenever a resource in the set changes
Cache.prototype.watch = function watch(cb){
	// TODO: might need to do some URI or other mapping
	return this.innerRoute.watch(cb);
}

// List all the URIs accessible through this route
Cache.prototype.listing = function listing(){
	return this.innerRoute.listing();
}

// Accept a request and store it at the given URI
// A fail will defer to another route to store the resource
Cache.prototype.store = function store(uri, request){
	return Promise.reject();
}

// Pass on to inbound route
Cache.prototype.error = function error(uri, request){
	return this.innerRoute.error(uri, request);
}

Cache.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
}

inherits(CacheResource, Resource);
module.exports.CacheResource = CacheResource;
function CacheResource(route, cachedObject){
	// if(!(this instanceof CacheResource)) return new CacheResource(route, resources);
	if(!(route instanceof Cache)) throw new Error('Expected `route` to be instnaceof Cache');
	if(!cachedObject) throw new Error('Expected `cachedObject`');
	this.route = route;
	this.cachedObject = cachedObject;
	// This resource doesn't provide `uri` or `contentType` since it's variable depending on the request details
	// The lack of these properties also prevents a Cache from being selected by another Cache
}
CacheResource.prototype.render = function render(req){
	// TODO write the headers!
	return this.cachedObject.stream;
};

