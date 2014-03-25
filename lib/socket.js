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
};

util.inherits(Socket, Transform);

Socket.prototype.connect = function () {
  socket = require(this.secure ? 'tls' : 'net').connect(this.port, this.host);
  socket.setEncoding('utf8');
  
  var self = this;
  socket.pipe(this).once('data', function (response) {
    socket.unpipe(self);
    self.emit('response', response);
  });

  /* socket.on('error', function (error) {
    self.emit('error', error);
  }); */
};

Socket.prototype._transform = function (chunk, encoding, callback) {
  var lines = chunk.toString().split('\r\n'), 
      response = Response.createFromString(lines.shift());

  this.push(response);

  response.write(lines.join('\r\n'));

  callback();
};

Socket.prototype.sendCommand = function (command, multiline) {
  this.expectsMultiline = multiline || false;
  this.buffer = new Buffer(0);
  this.response = null;

  var self = this;
  socket.pipe(this).on('data', function (response) {
    if (response.status >= 400) {
      throw new Error('An error received: ' + response.message + ' [' + response.status + ']');
    }

    if (multiline) {
      socket.pipe(response);
    }

    socket.unpipe(self);

    response.on('end', function () {
      socket.unpipe(response);
    })

    self.emit('response', response);
  });

  socket.write(command + "\r\n");
};

module.exports = Socket;
