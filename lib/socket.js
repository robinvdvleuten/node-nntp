var util = require('util')
  , events = require('events');

var Socket = function (host, port, secure) {
  this.host = host;
  this.port = port;
  this.secure = secure || false;
  this._socket = null;

  events.EventEmitter.call(this);
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.connect = function () {
  this._socket = require(this.secure ? 'tls' : 'net').connect(this.port, this.host);
  this._socket.setEncoding('utf8');

  var self = this;

  this._socket.once('data', function (data) {
    this.pause();

    var response = self.createResponseFromString(data);
    self.emit('connection', response);
  });

  this._socket.on('error', function (error) {
    self.emit('error', error);
  });
};

Socket.prototype.createResponseFromString = function (string) {
  var matches = /^(\d{3}) ([\S\s]+)$/g.exec(string.trim());
  if (!matches) {
    this.emit('error', new Error('Invalid response given: ' + string));
    return;
  }

  if (matches[1] < 100 || matches[1] >= 600) {
    this.emit('error', new Error('Invalid status code given: ' + matches[1]));
    return;
  }

  return {
    'status': parseInt(matches[1], 10),
    'message': matches[2]
  };
};

Socket.prototype.sendCommand = function (command, multiline) {
  multiline = multiline || false;

  var self = this;

  this._socket.once('data', function (data) {
    var response = self.createResponseFromString(data);
    if (!multiline || response.status >= 400) {
      var error = null;
      if (response.status >= 400) {
        return self.emit('error', new Error('An error received: ' + response.message + ' [' + response.status + ']'));
      }

      self._socket.pause();
      return self.emit('response', response);
    }

    var buff = new Buffer(0);

    self._socket.on('data', function (data) {
      buff = Buffer.concat([buff, Buffer.isBuffer(data) ? data : new Buffer(data)]);
      if (buff.toString('utf8', buff.length - 3) != ".\r\n") {
        return;
      }

      // Remove '\r\n\.\r\n' at the end of the buffer
      response.buffer = buff.slice(0, buff.length - 5);
      self._socket.removeAllListeners('data');
      self._socket.pause();

      self.emit('response', response);
    });

    var lines = data.split("\r\n");
    lines.shift();
    data = lines.join("\r\n");

    self._socket.push(data);
  });

  this._socket.resume();
  this._socket.write(command + "\r\n");
}

module.exports = Socket;
