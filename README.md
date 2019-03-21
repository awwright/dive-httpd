# Dive HTTPd

A prototype HTTP application framework using URI Templates and streams for looking up, rendering, and persisting content from/to a data store.

Attempts to fully implement all the features of HTTP in an easy-to-understand API:

* Content-Type negotiation with Content-Location header
* Link header
* Dynamic rendering of resources on local filesystem
* Automatically computing and sending caching headers


## Features

* Define data sources that map URIs to database resources
* Map a URI template to a render function
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
* render()
* post()
* del()
* patch()

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


### Transforms

Investigate various ways to transform content:

* Script/stylesheet precompilation/compression
* Markdown
* Template system
* XSLT


## To-do

* Responses must encode information on all of the resources used to compute the local content (including database queries, local files, templates, and ideally application revision)
* accept a block of return data
* Compute caching headers
* Pass & set metadata like media type, caching, authorization, etc.
* Persist documents back to their data source
* `verify` subroutine that asserts configuration options are OK, referenced files exist, ect.

Resource: Represents a resource found by Route#prepare
Resource#get: collect all the information necessary to render an information resource
Resource#post: execute the resource in some fashion
Resource#del: make the resource not exist anymore - subsequent calls should return 404
Resource#render: Generate an output stream
Resource#patch: Modify the resource in-place
Resource#end: Called after the response has been written, use this oppertunity to close database connections, etc

OutgoingMessageTransform Stream:
Requirements:
- Incoming metadata gets passed to _transform{Foo} methods
- _transform methods may be asynchronous via callback or Promise
- _transform methods are functional - pass a new or immutable instance to downstream
- Can they be called multiple times? Might be useful to guarentee single call
API:
- write(data)
- end()
- setHeader(name, value)
- setContentType(value)
- setContentTypeParam(name, value)
- getHeader()
- getHeaders(name)
- hasHeader(name)
- removeHeader(name)
