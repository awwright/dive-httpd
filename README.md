# Dive HTTPd

A prototype HTTP application framework using URI Templates and streams for looking up, rendering, and persisting content from/to a data store.


## Features

* Implementation of HTTP Semantics for transport over any HTTP-compatible protocol
* Suitable for HTML websites, static website generation, and RESTful HTTP APIs
* Encourages adherence to HTTP specifications, otherwise unopinionated
* Automatically send correct status codes and response headers
* Automatically sends:
	* 304 Not Modified
	* 404 Not Found
	* 405 Method Not Allowed
	* 412 Precondition Failed
	* 501 Not Implemented
	* Allow (list of permitted methods)
	* Content-Location
	* Vary
* Fully routable and negotiable errors, including 404 and 5xx errors
* Deterministic URI router, not affected by insertion order & better than O(log n) scaling
* Content-Type negotiation

To accomplish this, Dive defines two primary concepts: _resources_ and _routes_. However, these have specific definitions, somewhat different than other HTTP frameworks:


### Resources

A resource is an entity identified by a URI, that has a media type and has a body, that exists in a single point in time. There may also be other metadata that describes this resource, like caching information. The contents of the resource need not be stored in memory, the resource just has to know it can get at them if necessary.

Resources render representations by one of several methods:

* A Node.js ReadableStream - returned by `Resource#render()`
* byte array (Buffer or UInt8Array) - returned in `Resource#renderBytes().body`
* string - returned in `Resource#renderString().body`
* an arbitrary value - returned in `Resource#renderValue().value`


### Routes

A route is an entity that describes a set of resources with a URI Template. The set of resources is usually "the set of all resources of a certain media type and profile, that exist under the authority of this server." For example, the set of HTML documents of blog posts published by this server, or the set of JSON documents describing a Git repository on this server.

The resource parameters (the values for the variables in the URI Template) uniquely identify a resource within the route. Formally, resources are always looked up by their URI. Internally for performance, resources are also looked up by their parameters.

Route by itself is an abstract class, there are several broad subclasses of routes:


#### Data source routes

First are data sources, which are the lowest level. They map HTTP resources in terms of other resources, for example a filesystem, or a hard-coded document.

Data sources use the parameters from the parsed URI to lookup values from a data source. For example, a file by its file path, or a database record by its stringified id.

* `Route` accepts a `prepare` option that can be used to define hard-coded sets of resources
* `RouteRedirect` always returns a 3xx redirect response
* `RouteStaticFile` looks up a file on the filesystem


#### Transforming routes

Second are transforming routes, which defines a set of resources in terms of a 1:1 mapping onto another set via some function. For example, a template route can produce a set of HTML documents from a set of JSON documents, via an isomorphic mapping.

Transforming routes use the parameters from the parsed URI to fill in the URI template from an underlying set. For example, an HTML template might provide a set of HTML documents at `http://localhost/{file}.html`, the `file` variable will be extracted and filled in to find the equivalent JSON document at `http://localhost/{file}.json`.


#### Caching routes

Caching routes try to fill from a data source (the cache) first, forwarding the request to an inner route after a cache miss.

Caching routes are otherwise transparent, and do not perform any transformations on the data or resource URI; they copy the uriTemplate of the inner route exactly.


#### Aggregation routes

Aggregation routes generate a fixed resource (or set of resources) from another route.

Examples of collection indexes include blog archives, file listings, sitemaps, and Atom/RSS feeds.


#### Combination routes

Finally, there are combination routes, which defines a set in terms of multiple other sets. Dive defines several of these:

* `First` looks (in sequence) through an ordered list of sets and returns the first Resource that it finds
* `RouteURITemplate` uses a URI Template router to pick the most specific pattern that matches the input URI
* `Negotiate` queries all underlying sets for the specified resource and, depending on the HTTP request headers, returns a suitable matching document

Combination routes do not read parameters from the parsed URI, though they may still have an associated URI Template that's used by transforming routes.


## API

### Resource

 A `Resource` instance has the following properties:

* route - the Route to which this resource belongs
* uri - the URI of this representation
* params - data that can fill into route.uriTemplate to generate the URI
* contentType - the media type
* etag - the entity tag
* lastModified - the Last-Modified date
* methods - array of custom methods this resource recognizes
* render(req) - stream the contents of this resource
* renderString(req) - resolves to a MessageHeaders object with a `body` property

The `req` parameter (used in the render and renderString functions) is similar to IncomingMessage, and uses the following properties:

* `method` - the HTTP method being called
* `uri` - the full, absolute URI being requested (absolute meaning "no fragment")
* `headers` - map of headers, pseudo-headers and hop-by-hop headers removed
* `rawHeaders` - Array, alternating name and value of each header


### StreamResource

A kind of `Resource` that will call Route#render(resource, request) to satisfy a Resource#render(request) call. To use:

1. Implement `Route#prepare(uri)` with a function that resolves to a `StreamResource(this)`
2. Implement `Route#renderString(resource)` with a function that returns a `ServerResponse` instance.


### StringResource

A kind of `Resource` that will call Route#renderString(resource, request) to satisfy a Resource#render(request) call. To use:

1. Implement `Route#prepare(uri)` with a function that resolves to a `StringResource(this)`
2. Implement `Route#renderString(resource)` with a function that resolves to a `MessageHeaders` instance with a `body` property.


### Route

A `Route` instance provides the following properties:

* uriTemplate - a URI Template that can generate URIs for all of the resources in its resource set
* resourceType - The prototype that prepare usually resolves to
* prepare(uri) - resolves to a Resource object if the given URI names a resource in the resource set, resolves undefined otherwise
* allocate(uri) - resolves to a Resource object if something can be stored at the given URI, typically called only for PUT requests if `prepare` yielded no results
* listing() - resolves to an array of all of the URI Template values of resources in the set
* watch(cb) - call the provided callback when any of the resources in the set changes, returns when all resources have been initialized
* listDependents() - returns an array of other routes that this route makes requests to (used for static analysis)
* error(uri, error) - resolve to a Resource that describes the given `error`, when no Route#resolve call resolved a Resource (usually 404 or a 5xx error)

watch takes a callback with two arguments:

* resource - the resource in the Route that changed
* ancestor - an object representing the data change that triggered the event


### Application

Most applications are defined inside an Application. It is a type of Route that implements several features commonly implemented by a Web application:

- Ability to fix host name (i.e. assume a constant value for the Host header)
- Ability to fix the scheme (i.e. assume `http:`)
- Creates a downstream URITemplate router by default

Application uniquely has a `handleRequest` method. This is called by various listeners, after being normalized down to (abstracted into) standard HTTP semantics (RFC7231). This abstraction applies the following to the standard Node.js req/res objects:

- HTTP connection options (any headers listed in the Connection header) are parsed and removed, including:
	- Chunked encoding, which is exposed as a stream
- The request-URI, and headers related to it, including
	- the Host header
	- HTTP/2 scheme/host/path pseudo-headers
- The method, which is stored in the "method" property
- The response status, which is stored in the "statusCode" property
- The response status message, which is stored in the "statusMessage" property
- Other HTTP headers, which are listed in a "headers" object


### Listener

A Listener opens a server and translates requests and responses between an Application.

* new Listener(app, flags, config)
	* app - reference to an Application (or any Route)
	* flags - a list of runtime flags that the Listener can observe (See runtime flags)
* HTTPServer#open
* HTTPServer#close

Runtime flags:

* pretend - don't automatically make changes to resources (filesystem, databases, or otherwise), only print output
* debug - enable features that would be questionable on production systems, such as printing error stacks inside responses
* watch - hold the process open and react to changing resources
* readonly - don't modify resources, return error on requests that would result in a server state change


### HTTPServer

HTTPServer is a Listener that translates HTTP requests into calls to Application. HTTPServer is designed to be Internet-facing, and listens on as many protocols as are supported.

* new HTTPServer(app, flags, config)
* HTTPServer#open
* HTTPServer#close


### RouteURITemplate

* new RouteURITemplate()
* RouteURITemplate#router - the URITemplateRouter instance
* RouteURITemplate#addRoute - adds a router (with a `uriTemplate` property) to the list of routes


### RouteLocalReference

Change the URI of a resource being routed.

* new RouteLocalReference(uriTemplate, inbound, [targetTemplate])


### First

For incoming requests, check several downstream routes in order.

* new First(uriTemplate, routes)


### Negotiate

Check several inbound routes and pick the one that best matches the client's Accept header.

* new Negotiate(uriTemplate, routes)


### Cache

Cache responses on a filesystem or other database.

* new Cache(inbound, options)


### Gateway

Forward an HTTP response over the network.

* new Gateway(options)


### RoutePipeline

Transform an HTTP request and/or response, e.g. apply a template.

* new RoutePipeline(options)


### RouteStaticFile

Generate a response from a file.

* new RouteStaticFile(options)


