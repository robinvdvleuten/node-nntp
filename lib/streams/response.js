var util = require('util'),
    Transform = require('stream').Transform;
    Response = require('../response');

function ResponseStream (multiline) {
  this.multiline = multiline || false;

  var response;
  this._transform = function (chunk, encoding, callback) {
    if (undefined === response) {
      response = Response.createFromString(encoding === 'buffer' ? chunk.toString() : chunk);

      if (false === this.multiline) {
        this.push(response);
        this.end();
      }
    } else {
      response.lines.push(chunk);
    }

    callback();
  };

  this._flush = function (callback) {
    this.push(response);
    callback();
  }

  Transform.call(this, { objectMode: true });
};

util.inherits(ResponseStream, Transform);

module.exports = ResponseStream;
