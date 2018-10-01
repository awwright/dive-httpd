
const inherits = require('util').inherits;
const ServerResponseTransform = require('./').ServerResponseTransform;

module.exports = Markdown;

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
