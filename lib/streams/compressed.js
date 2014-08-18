'use strict';

var util = require('util'),
    zlib = require('zlib'),
    Transform = require('stream').Transform;

var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

function CompressedStream () {
  var self = this,
      buffer = '',
      response,
      lines;

  this._transform = function (chunk, encoding, callback) {
    buffer += encoding === 'buffer' ? chunk.toString('binary') : chunk;

    if (undefined === response && -1 !== buffer.indexOf('\r\n')) {
      response = buffer.substring(0, buffer.indexOf('\r\n') + 2);
      buffer = buffer.substring(buffer.indexOf('\r\n') + 2);
      this.push(response);
    }

    zlib.inflate(new Buffer(buffer, 'binary'), function (error, result) {
      if (undefined !== result && '.\r\n' === result.toString().substr(-3)) {
        self.push(result);
        self.end();
      }

      callback();
    });
  };

  Transform.call(this);
};

util.inherits(CompressedStream, Transform);

module.exports = CompressedStream;
