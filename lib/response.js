var util = require('util'),
	Transform = require('stream').Transform || require('readable-stream').Transform;

var Response = function (status, message, options) {
  this.status = status;
  this.message = message;
  this.options = options || {};

  Transform.call(this, this.options);
};

util.inherits(Response, Transform);

Response.createFromString = function (string) {
  var matches = /^(\d{3}) ([\S\s]+)$/g.exec(string.trim());
  if (!matches) {
    throw new Error('Invalid response given: ' + string);
  }

  if (matches[1] < 100 || matches[1] >= 600) {
    throw new Error('Invalid status code given: ' + matches[1]);
  }

  return new Response(parseInt(matches[1], 10), matches[2]);
};

Response.prototype._transform = function (chunk, encoding, callback) {
  var lines = chunk.toString().trim().split('\r\n');
  
  for (var i = 0; i < lines.length; i++) {
  	if (lines[i] === '.') {
  	  this.emit('end');
  	} else {
  	  this.push(lines[i]);
  	}
  };

  callback();
};

module.exports = Response;