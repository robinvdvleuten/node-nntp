'use strict';

var util = require('util'),
    zlib = require('zlib'),
    Transform = require('stream').Transform;

function CompressedStream () {
  var self = this,
      chunks = [],
      buffer,
      response;

  this._transform = function (chunk, encoding, callback) {
    chunks.push(encoding === 'buffer' ? chunk : new Buffer(chunk, 'binary'));

    if (undefined === response && -1 !== (buffer = Buffer.concat(chunks).toString('binary')).indexOf('\r\n')) {
      response = buffer.substring(0, buffer.indexOf('\r\n') + 2);
      chunks = [new Buffer(buffer.substring(buffer.indexOf('\r\n') + 2), 'binary')];

      this.push(response);
    }

    zlib.inflate(Buffer.concat(chunks), function (error, result) {
      if (undefined !== result && '.\r\n' === result.toString().substr(-3)) {
        self.push(result);
        self.end();
      }

      callback();
    });
  };

  Transform.call(this);
}

util.inherits(CompressedStream, Transform);

module.exports = CompressedStream;
