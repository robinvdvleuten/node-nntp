'use strict';

var util = require('util'),
    Transform = require('stream').Transform;

function MultilineStream () {
  var self = this;

  var buffer = '';
  this._transform = function (chunk, encoding, callback) {
    buffer += encoding === 'buffer' ? chunk.toString() : chunk;
    if ('.\r\n' === buffer.substr(-3)) {
      buffer.slice(0, -3).trim().split('\r\n').forEach(function (line) {
        self.push(line);
      });

      this.end();
    }

    callback();
  };

  Transform.call(this, { objectMode: true });
}

util.inherits(MultilineStream, Transform);

module.exports = MultilineStream;
