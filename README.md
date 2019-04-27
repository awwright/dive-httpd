# Dive HTTPd

A prototype HTTP application framework using URI Templates and streams for looking up, rendering, and persisting content from/to a data store.


## Features

* Define routes that map sets of HTTP resources in terms of other data sources
* Enumerate resources hosted at a data source
* Static file generation
* Content-Type negotiation between different underlying resources, with Content-Location & Vary header
* Store a resource into a data source
* Render a resource (a pointer provided by a data source) into a response (a document with metadata)
* Transform a document into a related version (e.g. Markdown into HTML, and plain HTML into themed HTML)

To accomplish this, Dive defines two primary concepts: _resources_ and _routes_. However, these have specific definitions, somewhat different than other HTTP frameworks:


### Resources

A resource is an entity identified by a URI, that has a media type and has a body of a string of bytes. There may also be other metadata that describes this resource, like caching information.

A `Resource` instance represents a single snapshot of a resource at a point in time for use in a single HTTP request. A `Resource` instance has the following properties:

* uri
* contentType
* params
* route
* render()
* renderBytes()
* renderString()
* renderValue()
* post()
* del()
* patch()

Resources can have one of several _interfaces_, methods by which data about the resource is exposed.

* Stream - returned by `Resource#render()`
* bytes (Buffer or UInt8Array) - returned in `Resource#renderBytes().body`
* string - returned in `Resource#renderString().body`
* arbitrary value - returned in `Resource#renderValue().value`


### Routes

A route is an entity that describes a set of resources with a URI Template. The values for the variables in the URI Template can themselves be used to uniquely identifiy the resource within the route.

A `Route` instance provides the following properties:

* uriTemplate - a URI Template that can generate URIs for all of the resources in its resource set
* prepare(uri) - resolves to a Resource object if the given URI names a resource in the resource set, resolves undefined otherwise
* listing() - resolves to an array of all of the URI Template values of resources in the set
* watch(cb) - call the provided callback when any of the resources in the set changes
* listDependents() - returns an array of other routes that this route makes requests to (used for static analysis)
* error(uri, error) - resolve to a Resource that describes the given `error`, when no Route#resolve call resolved a Resource (usually 404 or a 5xx error)

A route provides a method that can look up a Resource instance given a URI.

This somewhat veries from the typical definition of a "route" in an HTTP framework, and is a more general definition

Route by itself is an abstract class, there are three broad subclasses of routes:


#### Data source routes

First are data sources, which are the lowest level. They map HTTP resources in terms of other resources, for example a filesystem, or a hard-coded document.

Data sources use the parameters from the parsed URI to lookup values from a data source. For example, a file by its file path, or a database record by its stringified id.


#### Transforming routes

Second are transforming routes, which defines a set of resources in terms of a 1:1 mapping onto another set via some function. For example, a template route can produce a set of HTML documents from a set of JSON documents, via an isomorphic mapping.

Transforming routes use the parameters from the parsed URI to fill in the URI template from an underlying set. For example, an HTML template might provide a set of HTML documents at `http://localhost/{file}.html`, the `file` variable will be extracted and filled in to find the equivelant JSON document at `http://localhost/{file}.json`.


#### Caching routes

Caching routes try to fill from a data source (the cache) first, forwarding the request to an inner route after a cache miss.

Caching routes are otherwise transparent, and do not perform any transformations on the data or resource URI; they copy the uriTemplate of the inner route exactly.


#### Combination routes

Finally, there are combination routes, which defines a set in terms of multiple other sets. Dive defines several of these:

* `First` looks (in sequence) through an ordered list of sets and returns the first Resource that it finds
* `HTTPServer` uses a URI Template Router to pick the most specific pattern that matches the input URI
* `Negotiate` queries all underlying sets for the specified resource and, depending on the HTTP request headers, returns a suitable matching document

Combination routes do not read parameters from the parsed URI, though they may still have an associated URI Template that's used by transforming routes.


## To-do

* define `edgeLabel` property that describes when the route is selected or what transformations are applied on the inner route
* Allow different methods of rendering a resource (to a stream, to a byte array, to a string, or to an arbritrary value).
* Specify custom error handling of Not Found and Internal Server Errors
* Responses must encode information on all of the resources used to compute the local content (including database queries, local files, templates, and ideally application revision)
* Script/stylesheet compression
* Template systems
* Compute caching headers
* Persist documents back to their data source
* `verify` subroutine that asserts configuration options are OK, referenced files exist, ect.
* consider different start-up behaviors: Buffer HTTP requests, return 503, or don't listen at all until ready.
