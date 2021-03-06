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

A resource is an entity identified by a URI, that has a media type and contents, as it exists in a single point in time. There may also be other metadata that describes this resource, like caching information. The actual contents of the resource need not be stored in memory; the resource just has to know it can get at them if necessary.

Resources render representations by implementing the `Resource#render()` method, which typically returns a `ServerResponse` stream.


### Routes

A route describes a set of similar resources, which may vary by various request parameters, like variables matched to a URI Template, or request headers.

For example, a Route may be a set of HTML blog posts, or a set of JSON documents each describing a Git repository.

Resources within a route may vary along zero dimensions; in which case the set will contain exactly one document (by the multiplicative identity).

The resource parameters (the values for the variables in the URI Template) uniquely identify a resource within the route. Formally, resources are always looked up by their URI. Internally for performance, resources are also looked up by their parameters.

Route by itself is an abstract class, there are several broad subclasses of routes:


#### Data source routes

The "lowest level" of Route is a data source. They map HTTP resources in terms of other resources, for example a filesystem, database query, or a hard-coded document.

Data sources use the parameters from the parsed URI to lookup values from a data source. For example, a file by its file path, or a database record by its stringified id.

* `Route` accepts a `prepare` option that can be used to define hard-coded sets of resources
* `RouteRedirect` always returns a 3xx redirect response
* `RouteFilesystem` looks up a file on the filesystem


#### Transforming routes

Second are transforming routes, which defines a set of resources in terms of a 1:1 mapping onto another set via some function. For example, a template route can produce a set of HTML documents from a set of JSON documents, via an isomorphic mapping.

Transforming routes use the parameters from the parsed URI to fill in the URI template from an underlying set. For example, an HTML template might provide a set of HTML documents at `http://localhost/{file}.html`, the `file` variable will be extracted and filled in to find the equivalent JSON document at `http://localhost/{file}.json`.

Transforming routes are easily created with `new TransformRoute(opts, innerRoute)`. The `TransformRoute#render_transform(resource, req, input, output)` method is used to generate the resource. The `input` argument is a readable response to be transformed, and `output` is the writable response to write the resource to.


#### Caching routes

Caching routes try to fill from a data source (the cache) first, forwarding the request to an inner route after a cache miss.

Caching routes are otherwise transparent, and do not perform any transformations on the data or resource URI; they copy the uriTemplate of the inner route exactly.


#### Collection/Aggregation routes

An aggregation routes, or simply a Collection, generates resources using the contents of multiple other resources from another route.

Examples of collections include blog archives, file listings, sitemaps, Atom/RSS feeds, and search results.

In its simplest form, it will contain a single resource that links to each resource in a route. In more complicated forms, it may represent a paginated archive, or dynamically generate search results from an index.


#### Combination routes

Finally, there are combination routes, which defines a set in terms of multiple other sets. Dive defines several of these:

* `First` looks (in sequence) through an ordered list of sets and returns the first Resource that it finds
* `RouteURITemplate` uses a URI Template router to pick the most specific pattern that matches the input URI
* `Negotiate` queries all underlying sets for the specified resource and, depending on the HTTP request headers, returns a suitable matching document

Combination routes do not read parameters from the parsed URI, though they may still have an associated URI Template that's used by transforming routes.

### Error Handling

All errors in the course of processing a request are caught and rendered into error responses, if a response has not already been written.

If the request has a URI, the error response is routed to a handler in a similar fashion to a request handler.

* If no Route claims a URI, this generates a NotFound error
* If the Resource cannot handle the requested HTTP method, the default `handle` implementation, which generate a MethodNotAllowed error.
* User errors that specify 4xx status code, for example, to signal an invalid payload
* Uncaught errors, "error" events on a Readable stream, or rejected Promises, which are given a 500 status code.

Errors always flow into a Writable side and out of a Readable side. Errors in streams are caught by the HTTP server. If a response has not already been written, one is generated from the error by calling the following functions to see which can generate one:

* If the error was received from a Resource, the  will first call `Resource#error` if it exists.
* `Application#error` is called, which in turn consults the URI router and child routes to determine who has a `Route#error` willing to handle the error.
* If the error is a NotFound error, `Application#defaultNotFound` may generate a generic "Page Not Found" error. This is primarily used for generating static websites.
* Finally, `Application#onError` writes a test/plain response; additionally, the stack will be written if `Application#debug` is true.

Additionally, if the error was a 500 class error, it will be logged (by default, printed to stderr).
If `Application#debug` is true, all errors are logged.

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
* handle(req) - the default implementation calls render/post/del etc. as appropriate. Emits "error" event in event of an error.
* post(req) - process the incoming stream, and generate a response to it
* del(req) - disassociate the URI from the underlying resource, i.e. delete the resource
* patch(req) - apply the specified modification to the resource
* trace(req) - Handle a TRACE request; the default does need to be changed unless the request is being forwarded over the network.
* custom(req) - called for HTTP methods specified in `methods` not handled by one of the above
* error(err) - resolves to another Resource object that will handle the given Error `err`. May be left undefined, in which case, the route will search elsewhere for a function that can handle the error (see "Error Handling" above).

The `req` parameter (used in the render functions) is similar to IncomingMessage, and uses the following properties:

* `method` - the HTTP method being called
* `uri` - the full, absolute URI being requested (absolute meaning "no fragment")
* `headers` - map of headers, pseudo-headers and hop-by-hop headers removed
* `rawHeaders` - Array, alternating name and value of each header


### Route

A `Route` instance provides the following properties:

* uriTemplate - a URI Template that can generate URIs for all of the resources in its resource set
* resourceType - The prototype that prepare usually resolves to
* prepare(uri) - resolves to a Resource object if the given URI names a resource in the resource set, resolves undefined otherwise
* prepare_match(match) - resolves to a Resource object given the matched URI Template, called by the default implementation of Route#prepare
* allocate(uri) - resolves to a Resource object if something can be stored at the given URI, typically called only for PUT requests if `prepare` yielded no results
* allocateMatch(match) - resolves to a Resource object if something can be stored at the given URI Template match, called by the default implementation of Route#allocate
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


### RouteFilesystem

Generate a response from a file.

* new RouteFilesystem(options)


