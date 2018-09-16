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


## To-do

* PUT, POST, OPTIONS support
* Pass & set metadata like media type, caching, authorization, etc.
* Persist documents back to their data source
* `verify` subroutine that asserts configuration options are OK, referenced files exist, ect.


OutgoingMessageTransform Stream:
- write(data)
- end()
- setHeader(name, value)
- setContentType(value)
- setContentTypeParam(name, value)
- getHeader()
- getHeaders(name)
- hasHeader(name)
- removeHeader(name)
