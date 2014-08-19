'use strict';

var util = require('util'),
    Transform = require('stream').Transform;

function MultilineStream () {
  var self = this;

  var chunks = [],
      buffer,
      lines;

  this._transform = function (chunk, encoding, done) {
    chunks.push(encoding === 'buffer' ? chunk : new Buffer(chunk));

    if ('.\r\n' === (buffer = Buffer.concat(chunks).toString()).substr(-3)) {
      lines = buffer.slice(0, -3).trim().split('\r\n');

      for (var i = 0; i < lines.length; i++) {
        this.push(lines[i]);
      }

      this.push(null);
    }

    done();
  };

  Transform.call(this, { objectMode: true });
}

util.inherits(MultilineStream, Transform);

module.exports = MultilineStream;
