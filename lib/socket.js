var util = require('util'),
    Transform = require('stream').Transform || require('readable-stream').Transform,
    xtend = require('xtend'),
    Response = require('./response'),
    socket;

var Socket = function (host, port, secure, options) {
  this.host = host;
  this.port = port;
  this.secure = secure || false;
  this.options = xtend({ objectMode: true }, options);

  this.expectsMultiline = false;
  this.buffer = new Buffer(0);
  this.response = null;

  Transform.call(this, this.options);
}

util.inherits(Socket, Transform);

Socket.prototype.connect = function () {
  socket = require(this.secure ? 'tls' : 'net').connect(this.port, this.host);
  socket.setEncoding('utf8');
  socket.pipe(this);

  /* socket.on('error', function (error) {
    self.emit('error', error);
  }); */
};

Socket.prototype._transform = function (chunk, encoding, callback) {
  this.buffer = Buffer.concat([this.buffer, Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk)]);

  if (!this.response) {
    var lines = this.buffer.toString().split('\r\n');
    this.response = Response.createFromString(lines.shift());
    this.buffer = new Buffer(lines.join('\r\n'));

    if (this.response.status >= 400) {
      throw new Error('An error received: ' + this.response.message + ' [' + this.response.status + ']');
    }
  }

  if (!this.expectsMultiline) {
    this.push(this.response);
    return callback();
  }

  if (this.buffer.toString('utf8', this.buffer.length - 3) !== '.\r\n') {
    return callback();
  }

  // Remove '\r\n\.\r\n' at the end of the buffer
  this.response.buffer = this.buffer.toString().slice(0, this.buffer.length - 5);
  this.push(this.response);

  callback();
};

Socket.prototype.sendCommand = function (command, multiline) {
  this.expectsMultiline = multiline || false;
  this.buffer = new Buffer(0);
  this.response = null;

  socket.write(command + "\r\n");
}

module.exports = Socket;
