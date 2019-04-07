# Dive HTTPd

A prototype HTTP application framework using URI Templates and streams for looking up, rendering, and persisting content from/to a data store.

Attempts to fully implement all the features of HTTP in an easy-to-understand API:

* Content-Type negotiation with Content-Location header
* Link header
* Dynamic rendering of resources on local filesystem
* Automatically computing and sending caching headers


## Features

* Define routes that map sets of HTTP resources in terms of other data resources
* Content-negotiate a media type when requesting a data source
* Store a resource into a data source
* Enumerate resources hosted at a data source
* Link a route to multiple data sources to be checked in sequence
* Render a resource (a pointer provided by a data source) into a response (a document with metadata)
* Transform a document into a related version (e.g. Markdown into HTML, and plain HTML into themed HTML)
* Enumerate all the resources that can be rendered by the server, e.g. for generating a static website

Dive defines two primary concepts: resources and routes. However, these are defined with very specific definitions, somewhat different than other HTTP frameworks:


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

* routerURITemplate - a URI Template that can generate URIs for all of the resources in its resource set
* prepare(uri) - resolves to a Resource object if the given URI names a resource in the resource set, resolves undefined otherwise
* listing() - resolves to an array of all of the URI Template values of resources in the set
* watch(cb) - call the provided callback when any of the resources in the set changes

A route provides a method that can look up a Resource instance given a URI.

This somewhat veries from the typical definition of a "route" in an HTTP framework, and is a more general definition

Resources can technically be in multiple routes, and Resources can be considered to be a singleton route (a route that serves a single resource, itself).

Route by itself is an abstract class, there are three broad subclasses of routes:


#### Data source routes

First are data sources, which are the lowest level. They map HTTP resources in terms of other resources, for example a filesystem, or a hard-coded document.

Data sources use the parameters from the parsed URI to lookup values from a data source. For example, a file by its file path, or a database record by its stringified id.


#### Transforming routes

Second are transforming routes, which defines a set of resources in terms of a 1:1 mapping onto another set via some function. For example, a template route can produce a set of HTML documents from a set of JSON documents, via an isomorphic mapping.

Transforming routes use the parameters from the parsed URI to fill in the URI template from an underlying set. For example, an HTML template might provide a set of HTML documents at `http://localhost/{file}.html`, the `file` variable will be extracted and filled in to find the equivelant JSON document at `http://localhost/{file}.json`.


#### Combination routes

Finally, there are combination routes, which defines a set as a union of multiple sets. For example, the `First` route, and the URI Template router in the HTTPServer.

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
