
const Transform = require('stream').Transform;
const util = require('util');

module.exports.ServerResponseTransform = ServerResponseTransform;
util.inherits(ServerResponseTransform, Transform);
function ServerResponseTransform(options){
	Transform.call(this, options);
	this.statusCode = 200;
	this._headerList = [];
	options = options || {};
	if(options.transformContentType) this._transformContentType = options.transformContentType;
	if(options.transformHeader) this._transformHeader = options.transformHeader;
	if(!this._transform) throw new Error('_transform expected');
	if(!this._transformContentType) throw new Error('_transformContentType expected');
	if(!this._transformHeader) throw new Error('_transformHeader expected');
	
}
ServerResponseTransform.prototype._destinations = function _destinations(){
	if(this._readableState.pipesCount==0) return [];
	if(this._readableState.pipesCount==1) return [this._readableState.pipes];
	return this._readableState.pipes;
}
ServerResponseTransform.prototype.pipe = function pipe(dst, opt){
	var self = this;
	Transform.prototype.pipe.call(this, dst, opt);
	// Also copy metadata to dst:
	// Copy status code
	if(typeof dst.setStatusCode=='function') dst.setStatusCode(this.statusCode);
	else dst.statusCode = this.statusCode;
	// Copy headers
	for(var k in this._headerList){
		dst.setHeader(this._headerList[k][0], this._headerList[k][1]);
	}
	return dst;
}

ServerResponseTransform.prototype.setStatusCode = function setStatusCode(value){
	var self = this;
	self._destinations().forEach(function(dst){
		if(typeof dst.setStatusCode=='function') dst.setStatusCode(value);
		else dst.statusCode = value;
	});
	self.statusCode = value;
}

ServerResponseTransform.prototype.setHeader = function setHeader(name, value){
	var self = this;
	switch(name.toLowerCase()){
		case 'content-type': this._transformContentType(value, transformContentTypeEnd); break;
		default: this._transformHeader(name, value, transformHeaderEnd); break;
	}
	function transformContentTypeEnd(err, value){
		self._destinations().forEach(function(dst){
			dst.setHeader(name, value);
		});
		self._headerList[name.toLowerCase()] = [name, value];
	}
	function transformHeaderEnd(err, name, value){
		self._destinations().forEach(function(dst){
			dst.setHeader(name, value);
		});
		self._headerList[name.toLowerCase()] = [name, value];
	}
}

ServerResponseTransform.prototype.getHeader = function getHeader(name) {
  var entry = this._headerList[name.toLowerCase()];
  return entry && entry[1];
};

ServerResponseTransform.prototype.getHeaderNames = function getHeaderNames() {
  return this._headerList !== null ? Object.keys(this._headerList) : [];
};

ServerResponseTransform.prototype.getHeaders = function getHeaders() {
  const headers = this._headerList;
  const ret = Object.create(null);
  if (headers) {
    const keys = Object.keys(headers);
    for (var i = 0; i<keys.length; ++i) {
      ret[ keys[i] ] = headers[key][1];
    }
  }
  return ret;
};

ServerResponseTransform.prototype.hasHeader = function hasHeader(name) {
  return this._headerList !== null && !!this._headerList[name.toLowerCase()];
};
