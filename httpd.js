var http = require('http');
var stream = require('stream');
var inherits = require('util').inherits;

const {
	Processor,
	RouteNotFound,
	RouteStaticFile,
	RouteLocalReference,
	ServerResponseTransform,
	First,
	handleRequest,
} = require('./index.js');

var TemplateRouter = require('uri-template-router');
var markdown = require( "markdown" ).markdown;

var listenPort = process.env.PORT || 8080;

/*
Features:

* Match a URI to a route
* Execute a route and generate a response body
* Map a route to a database resource, then format it with a pipe
* Iterate over the database and generate responses
*/

var routes = new TemplateRouter.Router();

// Section 3. Transforms that transform streams
inherits(Markdown, ServerResponseTransform);
function Markdown(){
	if(!(this instanceof Markdown)) return new Markdown();
	ServerResponseTransform.call(this);
	this.sourceContents = '';
	debugger;
	this.push('<!DOCTYPE html>');
	this.push('<html xmlns="http://www.w3.org/1999/xhtml" lang="en" dir="ltr">');
	this.push('	<head>');
	//this.push('		<meta charset="UTF-8" />');
	//this.push('		<title></title>');
	//this.push('		<meta name="description" content="" />');
	this.push('	</head>');
	this.push('	<body>');
	this.push('		<main id="main-content">');
};
Markdown.prototype._transformContentType = function _transformContentType(value, callback){
	callback(null, 'application/xhtml+xml');
};
Markdown.prototype._transformHeader = function _transformHeader(name, value, callback){
	callback(null, name, value);
};
Markdown.prototype._transform = function _transform(data, encoding, callback){
	this.sourceContents += data;
	callback(null);
};
Markdown.prototype._flush = function (callback){
	this.push(markdown.toHTML(this.sourceContents));
	this.push('		</main>');
	this.push('	</body>');
	this.push('</html>');
	callback();
};

inherits(Edit, ServerResponseTransform);
function Edit(){
	if(!(this instanceof Edit)) return new Edit();
	ServerResponseTransform.call(this);
	this.push('Source:\n\n');
}
Edit.prototype._transform = function _transform(data, encoding, callback){ callback(null, data); };
Edit.prototype._flush = function (callback){ callback(); };

function Render(){
	return new ServerResponseTransform({
		transform: function(data, encoding, callback){ callback(null, data); },
		transformContentType: function(value, callback){ callback(null, 'application/xhtml+xml; profile=1'); },
		transformHeader: function(name, value, callback){ callback(null, name, value); },
		flush: function(callback){ callback(); },
	});
};

// Alias / to /index.html
routes.addTemplate('http://localhost/', {}, RouteLocalReference("http://localhost/index.html"));

// Determine which version to return based on Content-Type negotiation
//routes.addTemplate('http://localhost{/path*}', {}, new Conneg([
//	dereference("http://localhost{/path*}.html"),
//	dereference("http://localhost{/path*}.xhtml"),
//	dereference("http://localhost{/path*}.md"),
//	dereference("http://localhost{/path*}.src.html"),
//]));

// First see if there's a file on the filesystem
// Else, see if there's a Markdown file that we could generate this from
routes.addTemplate('http://localhost{/path*}.src', {}, new First([
	//RouteStaticFile(__dirname+'/web', "{/path*}.html"),
	RouteLocalReference("http://localhost{/path*}.md").pipe(Markdown),
]));

// Render a document from the source version
routes.addTemplate('http://localhost{/path*}.html', {}, RouteLocalReference("http://localhost{/path*}.src").pipe(Render) );

// Enable editing of the document in-browser
routes.addTemplate('http://localhost{/path*}.edit', {}, RouteLocalReference("http://localhost{/path*}.html").pipe(Edit) );

// Render a document from the source Markdown
routes.addTemplate('http://localhost{/path*}.md', {}, RouteStaticFile(__dirname+'/web', "{/path*}.md", "text/plain") );

var options = {
	fixedScheme: 'http',
	fixedAuthority: 'localhost',
	RouteNotFound: new RouteNotFound,
	routes: routes,
}

console.log('Available resources:');
routes.routes.forEach(function(route){
	//console.log('# '+route.template);
	//console.log(route.name.constructor);
	route.name.index(routes).forEach(function(rsc){
		console.log('- '+route.gen(rsc));
	});
});


var server = http.createServer(handleRequest.bind(null, options));
server.listen(listenPort);
console.log('Server running at http://127.0.0.1:' + listenPort + '/');

//console.log(routes.resolveURI('http://localhost/123.src'));
