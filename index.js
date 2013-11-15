var net = require('net'),
    tls = require('tls'),
    when = require('when');

function NNTP (host, options) {
  this.host = host;

  this.options = options || {};
  this.port = options.port || 119;
  this.secure = options.secure || false;

  this.socket = null;
};

NNTP.prototype.connect = function () {
  var deferred = when.defer();

  this.socket = (this.secure ? tls : net).connect(this.port, this.host);
  this.socket.setEncoding('utf8');

  var self = this;
  this.socket.once('data', function (data) {
    var response = self.createResponseFromString(data);
    deferred.resolve(response);
  });

  return deferred.promise;
};

NNTP.prototype.close = function () {
  this.socket.destroy();
}

NNTP.prototype.group = function (group) {
  var deferred = when.defer();

  this.sendCommand('GROUP ' + group, function (response) {
    var messageParts = response.message.split(' ');

    deferred.resolve({
      name:  messageParts[3],
      count: parseInt(messageParts[0]),
      first: parseInt(messageParts[1]),
      last:  parseInt(messageParts[2]),
    });
  });

  return deferred.promise;
};

NNTP.prototype.overview = function (range, format) {
  var deferred = when.defer();

  this.sendCommand('XOVER ' + range, true, function (response) {
    var messageStrings = response.buffer.toString('utf8').split('\r\n'),
        messages = [];

    for (i in messageStrings) {
      var messageParts = messageStrings[i].split('\t'),
          message = {};

      for (field in format) {
        message[field] = messageParts.shift();
      }

      messages.push(message);
    }

    deferred.resolve(messages);
  });

  return deferred.promise;
};

NNTP.prototype.overviewFormat = function () {
  var deferred = when.defer();

  this.sendCommand('LIST OVERVIEW.FMT', true, function (response) {
    var formatParts = response.buffer.toString('utf8').split('\r\n'),
        format = {number: false};

    for (i in formatParts) {
      if (formatParts[i].substr(-5, 5).toLowerCase() === ':full') {
        format[formatParts[i].slice(0, -5).toLowerCase()] = true;
      }
      else {
        format[formatParts[i].slice(0, -1).toLowerCase()] = false;
      }
    }

    deferred.resolve(format);
  });

  return deferred.promise;
};

NNTP.prototype.createResponseFromString = function (string) {
  var matches = /^(\d{3}) ([\S\s]+)$/g.exec(string.trim());
  if (!matches) {
    // @todo throw exception.
  }

  if (matches[1] < 100 || matches[1] >= 600) {
    // @todo throw exception.
  }

  return {
    'status': matches[1],
    'message': matches[2]
  }
};

NNTP.prototype.sendCommand = function (command, multiline, callback) {
  if (callback == undefined && typeof multiline == 'function') {
    callback = multiline;
    multiline = false;
  }

  multiline = multiline || false;

  var self = this;

  this.socket.once('data', function (data) {
    var response = self.createResponseFromString(data);

    if (multiline) {
      var buff = new Buffer(0);

      return self.socket.on('data', function (data) {
        buff = Buffer.isBuffer(data) ? data : new Buffer(data);
        if (buff.toString('utf8', buff.length - 3) != ".\r\n") return;

        // Remove '\r\n\.\r\n' at the end of the buffer
        response.buffer = buff.slice(0, buff.length - 5);
        self.socket.removeAllListeners('data');
        self.socket.pause();

        callback(response);
      });
    }

    self.socket.pause();
    callback(response);
  });

  this.socket.resume();
  this.socket.write(command + '\r\n');
};

module.exports = NNTP;
