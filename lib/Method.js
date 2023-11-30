"use strict";

const { ResponsePassThrough } = require('http-transform');
const { ResponseMessage } = require('./ResponseMessage.js');

// Behaviors that can vary based on method, and that are common to all calls to that method, may be defined here.

class Method {
	constructor(route){
		this.route = route;
	}
	renderStream(resource, request){
		const rendered = this.render(resource, request);
		if(rendered.next){
			const res = new ResponsePassThrough;

			return res.clientReadableSide;
		}else if(rendered.then){
			const res = new ResponsePassThrough;
			rendered.then(function(resolvedMessage){
				resolvedMessage.pipeMessage(res);
			});
			return res.clientReadableSide;
		}else if(rendered){
			// This is already a stream, return that
			return rendered;
		}
	}
	renderMessage(resource, request){
		return ResponseMessage.fromStream(this.render(resource, request));
	}
	preconditionFail(resource, res){
		if(this.safe){
			res.statusCode = 304; // Not Modified
		}else{
			res.statusCode = 412; // Precondition Failed
		}
		resource.preconditionFail(res);
	}
}
module.exports.Method = Method;

class GET extends Method {
	safe = true;
	creates = false;
	allowed(resource){
		return typeof resource.render === 'function';
	}
	render(resource, request){
		return resource.render(request);
	}
}

class HEAD extends Method {
	safe = true;
	creates = false;
	allowed(resource){
		return typeof resource.render === 'function';
	}
	render(resource, request){
		// TODO: check for empty body response
		return resource.render(request);
	}
}

class POST extends Method {
	safe = false;
	creates = false;
	allowed(resource){
		return typeof resource.post === 'function';
	}
	render(resource, request){
		return resource.post(request);
	}
}

class PUT extends Method {
	safe = false;
	creates = true;
	allowed(resource){
		return typeof resource.put === 'function';
	}
	render(resource, request){
		return resource.put(request);
	}
}

class DELETE extends Method {
	safe = false;
	creates = false; // This is debatable, a 404 or 200 response is all the same in the end
	allowed(resource){
		return typeof resource.del === 'function';
	}
	render(resource, request){
		return resource.del(request);
	}
}

class CONNECT extends Method {
	safe = false;
	creates = false;
	allowed(resource){
		return false;
	}
}

class OPTIONS extends Method {
	safe = false;
	creates = false;
	allowed(resource){
		return typeof resource.options === 'function';
	}
	render(resource, request){
		// TODO write a default handler for CORS probes
		return resource.options(request);
	}
}

class TRACE extends Method {
	safe = false;
	creates = true; // TRACE cannot 404
	allowed(resource){
		return typeof resource.trace === 'function';
	}
	render(resource, request){
		// TODO this method isn't implemented at a resource level
		return resource.trace(request);
	}
}

class PATCH extends Method {
	safe = false;
	// Some PATCH calls might 404
	// but that's up to the specific media type being uploaded
	creates = true;
	allowed(resource){
		return typeof resource.patch === 'function';
	}
	render(resource, request){
		return resource.patch(request);
	}
}

module.exports.methods = {
	GET,
	HEAD,
	POST,
	PUT,
	DELETE,
	CONNECT,
	OPTIONS,
	TRACE,
	PATCH,
};
