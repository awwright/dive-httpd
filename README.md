# Dive HTTPd

A prototype HTTP application framework using URI Templates and streams for looking up, rendering, and persisting content from/to a data store.

Attempts to fully implement all the features of HTTP in an easy-to-understand API:

* Content-Type negotiation with Content-Location header
* Link header
* Dynamic rendering of resources on local filesystem
* Automatically computing and sending caching headers

## Features

* Map a URI template to a handler that can process a resource
* Enumerate all the resources that can be rendered by the server, e.g. for generating a static website


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
