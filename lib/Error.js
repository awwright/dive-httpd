"use strict";

const errors = module.exports.errors = {};

function createErrorType(statusCode, errorCode, defaultMessage, parent) {
	const Super = parent || Error;
	function CustomError(message, data) {
		Error.captureStackTrace(this, this.constructor);
		if(typeof message === 'object'){
			data = message;
			message = defaultMessage;
		}
		this.data = data;
		this.message = message.replace(/\{([a-zA-Z_-]+)\}/g, function(match, key){
			if(data && (key in data)) return data[key];
			else return match;
		});
	}
	CustomError.prototype = new Super();
	CustomError.prototype.constructor = CustomError;
	CustomError.prototype.name = "Error [" + errorCode + "]";
	CustomError.prototype.statusCode = statusCode;
	CustomError.prototype.code = errorCode;
	return CustomError;
}

errors.ClientError = createErrorType(400, 'Client Error', 'Client Error');
errors.NotFound = createErrorType(404, 'Not Found', 'Resource <{uri}> not found');
errors.ServerError = createErrorType(500, 'Internal Server Error', 'Internal Server Error: {message}');
errors.NotImplemented = createErrorType(501, 'Not Implemented', 'Server does not implement the {method} HTTP method');
