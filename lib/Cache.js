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

const { inherits } = require('util');
const { Readable, Writable } = require('stream');
const assert = require('assert');
const crypto = require('crypto');

const { ResponsePassThrough, Headers } = require('http-transform');
const { Route } = require('./Route.js');
const { Resource } = require('./Route.js');

module.exports.Cache = Cache;

inherits(Cache, Route);
function Cache(opts, inbound){
	if(!(this instanceof Cache)) return new Cache(opts, inbound);
	this.innerRoute = inbound;
	if(!(this.innerRoute instanceof Route)) throw new Error('Expected `innerRoute` to be instanceof Route');
	if(!this.innerRoute.name) throw new Error('Missing name');
	if(!this.innerRoute.uriTemplate) throw new Error('Expected `innerRoute` to have a uriTemplate');
	this.uriTemplate = this.innerRoute.uriTemplate;
	this.contentType = this.innerRoute.contentType;
	this.label = opts.label || 'Cache';
	this.name = this.innerRoute.name + ' | ' + this.label;
	// pipeline.contentType = target.contentType;
	this.noStore = opts.noStore==null ? false : opts.noStore; // Force "no-store" directive: Do not save responses into the cache (might serve from cache)
	this.noCache = opts.noCache==null ? false : opts.noCache; // Force "no-cache" directive: Do not read from cache (might save into cache)
	this.bypass = opts.bypass==null ? false : opts.bypass; // Do not read or write from cache; intended to be a shortcut for removing the cache entirely
	this.onlyCache = opts.onlyCache==null ? false : opts.onlyCache; // Force "only-if-cached": Do not forward, only read from cache, return 504 (Gateway Timeout) if no entry
	this.forwardServerError = opts.forwardServerError==null ? false : opts.forwardServerError; // By default, handle 5xx errors as network errors. If true, forward 5xx errors as if it's our error
	this.private = opts.private; // if this cache may store "private" responses, default false
	this.maxage = opts.maxage; // the longest allowable duration (s) to hold onto a response

	// File storage options
	this.memoryStore = new Map;
}

// Determine if the response may be stored, depending on its values
Cache.mayStore = function mayStore(req, res){
	// Test that all of the following are true:
	// Does the request permit it (see mayStoreRequest)
	// - Is the request method understood and known as cachable?
	// - Is no-store omitted from the request?
	// Is the response status code understood?
	// Is no-store omitted from the response?
	// if this.private===false, is private omitted from the response?
	// If Authorization is present in the request, any of the following is present:
	// - Cache-Control: must-revalidate
	// - Cache-Control: public
	// - Cache-Control: s-maxage
	// Any of the following is present:
	// - Expires header field
	// - Cache-Control: max-age
	// - Cache-Control: s-maxage
	// - Cache-Control: public
	// - some other Cache-Control extension that allows caching
	// - Status code that is defined as cachable by default
	// Does nothing else prohibit caching as far as we know?
};

Cache.mayUseStored = function mayUseStored(req, storedReq, storedRes){
	// Do the request URIs match?
	// Do the request methods match?
	// If storedRes has Vary, do each of the named request headers match?
};

Cache.prototype.prepare = async function prepare(uri){
	// Lookup a URI to see if it exists, resolve a resource if so, or else fail
	// 1. Determine if the URI is part of the set of resources to be cached,
	// resolve undefined if not.
	const self = this;
	const innerRoute = self.innerRoute;
	if(self.bypass){
		return innerRoute.prepare.apply(innerRoute, arguments);
	}
	const match = self.matchUri(uri);
	if(!match) return;

	// 2. look in cache to see if we have a resource at the listed URI
	const key1 = this.computePrimaryKey(match.uri);
	assert(typeof key1==='string');

	// In order to use a stored response, all of the following must be true:
	// the stored effective request URI must match
	// the method "allows it to be used for the presented request"
	// the header fields in the request match, among the headers named by Vary in the response
	// the request does not contain Pragma: no-cache nor Cache-Control: no-cache (unless the result is validated)
	// the stored response is fresh, may be served stale, or is validated
	const hit = await self.storageRead(key1);
	if(hit){
		assert(hit instanceof CacheObject);
		// Read headers
		// Determine if a secondary key must be computed
		// Assume not for now
		// Determine if response is fresh
		// If not fresh, revalidate with inbound
		return new ResourceCacheHit(self, hit);
	}
	// console.error(`Cache miss ${match.uri} ${key1}`);
	// Cache miss, forward to origin
	// TODO Store request & response if permitted
	const resource = await innerRoute.prepare(uri);
	if(resource) return new ResourceCacheMiss(self, resource, key1);
};

Cache.prototype.computePrimaryKey = function computePrimaryKey(uri){
	const h = crypto.createHash('sha256');
	h.update(uri);
	return h.digest('hex');
};

// Call the provided function whenever a resource in the set changes
Cache.prototype.watch = function watch(cb){
	// TODO: might need to do some URI or other mapping
	return this.innerRoute.watch(cb);
};

// List all the URIs accessible through this route
Cache.prototype.listing = function listing(){
	return this.innerRoute.listing();
};

// Pass on to inbound route
Cache.prototype.error = function error(uri, request){
	return this.innerRoute.error ? this.innerRoute.error(uri, request) : Promise.resolve();
};

Cache.prototype.listDependents = function listDependents(){
	return [this.innerRoute];
};

module.exports.parseCacheControl = parseCacheControl;
function parseCacheControl(_value){
	var value = _value.toString();
	var map = new Map;
	// Cache-Control = 1#cache-directive
	// cache-directive = token [ "=" ( token / quoted-string ) ]
	// token = 1*tchar
	// tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*"
	//         / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
	//         / DIGIT / ALPHA
	//         ; any VCHAR, except delimiters
	// quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
	// qdtext        = HTAB / SP /%x21 / %x23-5B / %x5D-7E / obs-text
	// obs-text      = %x80-FF
	// quoted-pair    = "\" ( HTAB / SP / VCHAR / obs-text )
	while(value.length){
		// Consume whitespace
		{
			const i = value.match(/^\s*/);
			if(i && i[0].length>0) value = value.substring(i[0].length);
		}
		// Consume token
		var directiveName;
		{
			const i = value.match(/^([!#$%&'*+\-.^_`|~0-9A-Za-z]+)/);
			if(!i) throw new Error('Could not parse directive at NAME: '+JSON.stringify(value));
			directiveName = i[1];
			value = value.substring(i[0].length);
		}
		// Consume optional "="
		if(value[0]==='='){
			var directiveValue = null;
			if(value[1]==='"'){
				// Consume quoted-string
				const i = value.match(/^="(([!#$%&'*+\-.^_`|~0-9A-Za-z]|\\["\\])+)"/);
				if(!i) throw new Error('Could not parse directive at QS: '+JSON.stringify(value));
				directiveValue = i[1].replace(/\\([\\"])/g, (a,b)=>b);
				value = value.substring(i[0].length);
			}else{
				// Consume token
				const i = value.match(/^=([!#$%&'*+\-.^_`|~0-9A-Za-z]+)/);
				if(!i) throw new Error('Could not parse directive at TOK: '+JSON.stringify(value));
				directiveValue = i[1];
				value = value.substring(i[0].length);
			}
			map.set(directiveName, directiveValue);
		}else{
			map.set(directiveName, true);
		}
		// Consume whitespace
		{
			const i = value.match(/^\s*/);
			if(i && i[0].length>0) value = value.substring(i[0].length);
		}
		// Consume comma
		if(value[0]===',') value = value.substring(1);
		else break;
	}
	// Consume whitespace
	{
		const i = value.match(/^\s*/);
		if(i && i[0].length>0) value = value.substring(i[0].length);
	}
	if(value.length) throw new Error('Unexpected content at EOF: '+value);
	return map;
}

function CacheObject(){
	this.req = new Headers;
	this.req._readableSide = this.req;
	this.res = new Headers;
	this.res._readableSide = this.res;
	this.payload = null;
}

CacheObject.prototype.stream = function(){
	const res = new ResponsePassThrough();
	this.res.pipeHeaders(res);
	res.end(this.payload);
	return res.clientReadableSide;
}

// Resolve to stream if hit
// Resolve empty if miss
// Reject if filesystem error
Cache.prototype.storageRead = async function storageRead(key){
	const self = this;
	assert(typeof key === 'string');
	if(!self.memoryStore.has(key)) return;
	const obj = self.memoryStore.get(key);
	assert(obj);
	assert(obj instanceof CacheObject);
	return obj;
};

Cache.prototype.storageWrite = async function storageWrite(key, req, res){
	const obj = new CacheObject;

	// Copy Vary-relevant headers
	obj.req.method = req.method;
	obj.req.url = req.url;
	const vary = new Set((res.headers['vary'] || '').toString().split(/\s*,\s*/g).filter((v)=>v.length));
	for(var i=0; i<req.rawHeaders.length; i+=2){
		if(vary.has(req.rawHeaders[i]) && req.rawHeaders[i].length > 0){
			obj.req.addHeader(req.rawHeaders[i], req.rawHeaders[i+1]);
		}
	}
	obj.req.flushHeaders();

	// Copy response headers
	if(res.headersReady) await res.headersReady;
	res.pipeHeaders(obj.res);
	obj.res.flushHeaders();

	// 3. Buffer file contents
	const objects = [];
	for await (const chunk of res) objects.push(chunk);
	obj.payload = Buffer.concat(objects);

	this.memoryStore.set(key, obj);
};

Cache.prototype.storageClear = async function storageClean(){
	this.memoryStore.clear();
};

inherits(ResourceCacheMiss, Resource);
module.exports.ResourceCacheMiss = ResourceCacheMiss;
function ResourceCacheMiss(route, inner, key){
	// if(!(this instanceof ResourceCacheMiss)) return new ResourceCacheMiss(route, resources);
	if(!(route instanceof Cache)) throw new Error('Expected `route` to be instanceof Cache');
	if(!inner) throw new Error('Expected `inner`');
	assert(typeof key === 'string', 'Expected string `key`');
	this.route = route;
	this.inner = inner;
	this.key = key;
	// This resource doesn't provide `uri` or `contentType` since it's variable depending on the request details
	// The lack of these properties also prevents a Cache from being selected by another Cache
}
ResourceCacheMiss.prototype.handle = function handle(req){
	// There is no entry in the cache; all we have to do it store it (if permitted)
	// return Resource.prototype.handle.call(this, req);
	const route = this.route;
	const key = this.key;
	const res = new ResponsePassThrough;
	const copy = new ResponsePassThrough;
	const input = this.inner.handle(req);
	input.pipeMessage(res);
	input.pipeMessage(copy);
	input.headersReady.then(function(){
		if(copy.statusCode !== 206){
			return route.storageWrite(key, req, copy.clientReadableSide);
		}
	}).catch(function(err){
		res.destroy(err);
	});
	return res.clientReadableSide;
};

inherits(ResourceCacheHit, Resource);
module.exports.ResourceCacheHit = ResourceCacheHit;
function ResourceCacheHit(route, cachedObject){
	if(!(route instanceof Cache)) throw new Error('Expected `route` to be instanceof Cache');
	if(!cachedObject) throw new Error('Expected `cachedObject`');
	this.route = route;
	this.cachedObject = cachedObject;
	// This resource doesn't provide `uri` or `contentType` since it's variable depending on the request details
	// The lack of these properties also prevents a Cache from being selected by another Cache
}

ResourceCacheHit.prototype.handle = function handle(req){
	const self = this;
	const route = this.route;
	const uri = req.uri;
	const key = self.route.computePrimaryKey(uri);
	const res = new ResponsePassThrough;
	const obj = this.cachedObject;
	// Verify that "obj" is capable of filling the response for `req`
	if(obj && obj.req.method===req.method && testVary(obj.req, obj.res, req) && testFresh(obj.req, obj.res, req)){
		obj.stream().pipe(res);
		res.addHeader('Age', '3');
	}else if(req.method !== 'GET'){
		route.innerRoute.prepare(uri).then(function(resource){
			resource.handle(req).pipe(res);
		}).catch(function(err){
			res.destroy(err);
		});
	}else{
		// If it does not exist, then none of the responses match the method+Vary header requirements
		// Treat as a ResourceCacheMiss
		route.innerRoute.prepare(uri).then(function(resource){
			const uncached = new ResourceCacheMiss(route, resource, key);
			uncached.handle(req).pipe(res);
		}).catch(function(err){
			res.destroy(err);
		});
	}
	return res.clientReadableSide;
};

function testVary(sreq, sres, req){
	const vary = (sres.headers['vary'] || '').toString().split(/\s*,\s*/g);
	return vary.every(function(k){
		// Ignore empty tokens, that's just whitespace leftover from split()
		if(!k.length) return true;
		// A Vary value of "*" always fails to match
		if(k==='*') return false;
		// Normalize header names and values
		const kl = k.toLowerCase();
		const h0 = req.headers[kl] && testVaryNormalize(kl, req.headers[kl].toString());
		const h1 = sreq.headers[kl] && testVaryNormalize(kl, sreq.headers[kl].toString());
		// Test that both headers are the same, or that the array items are the same (toString will join with a comma)
		return (h0 === h1) || (h0 && h1 && h0.toString() === h1.toString());
	});
}

function testVaryNormalize(name, value){
	if(name='accept-language'){
		return value.toLowerCase().split(/\s*,\s*/g).sort().join(',');
	}
	return value;
}

function testFresh(sreq, sres, req){
	return true;
}

ResourceCacheHit.prototype.render = function render(req){
	// const res = new ResponsePassThrough;
	// this.cachedObject.pipe(res);
	// return res.clientReadableSide;
	return this.cachedObject;
};
