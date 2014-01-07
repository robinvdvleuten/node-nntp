var defaults = {
  host: 'localhost',
  port: 119,
  secure: false,
}

function NNTP (options) {
  this.options = mergeDefaults(defaults, options || {});
  this.socket = null;
};

NNTP.prototype.authenticate = function (callback) {
  var self = this;

  this.authInfo('USER', this.options.username, function (error, response) {
    if (error) {
      return callback(error);
    }

    if (response.status == 381) {
      if (!self.options.password) {
        return deferred.reject('Password is required');
      }

      return self.authInfo('PASS', self.options.password, callback);
    }

    callback(null, response);
  });
};

NNTP.prototype.connect = function (callback) {
  var self = this;

  this.socket = require(this.options.secure ? 'tls' : 'net').connect(this.options.port, this.options.host);
  this.socket.setEncoding('utf8');

  this.socket.once('data', function (data) {
    var response = self.createResponseFromString(data);

    callback(null, response);
  });

  this.socket.once('error', function (error) {
    callback(error);
  });
};

NNTP.prototype.close = function () {
  this.socket.destroy();
}

NNTP.prototype.authInfo = function (type, value, callback) {
  this.sendCommand('AUTHINFO ' + type + ' ' + value, callback);
}

NNTP.prototype.group = function (group, callback) {
  this.sendCommand('GROUP ' + group, function (error, response) {
    if (error) {
      return callback(error);
    }

    var messageParts = response.message.split(' ');

    callback(null, {
      name:  messageParts[3],
      count: parseInt(messageParts[0]),
      first: parseInt(messageParts[1]),
      last:  parseInt(messageParts[2]),
    });
  });
};

NNTP.prototype.overview = function (range, format, callback) {
  this.sendCommand('XOVER ' + range, true, function (error, response) {
    if (error) {
      return callback(error);
    }

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

    callback(null, messages);
  });
};

NNTP.prototype.overviewFormat = function (callback) {
  this.sendCommand('LIST OVERVIEW.FMT', true, function (error, response) {
    if (error) {
      return callback(error);
    }

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

    callback(null, format);
  });
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
    if (!multiline || response.status >= 400) {
      var error = null;
      if (response.status >= 400) {
        error = 'An error received: ' + response.message + ' [' + response.status + ']';
      }

      self.socket.pause();
      return callback(error, response);
    }

    var buff = new Buffer(0);

    self.socket.on('data', function (data) {
      buff = Buffer.concat([buff, Buffer.isBuffer(data) ? data : new Buffer(data)]);
      if (buff.toString('utf8', buff.length - 3) != ".\r\n") return;

      // Remove '\r\n\.\r\n' at the end of the buffer
      response.buffer = buff.slice(0, buff.length - 5);
      self.socket.removeAllListeners('data');
      self.socket.pause();

      callback(null, response);
    });

    var lines = data.split("\r\n");
    lines.shift();
    data = lines.join("\r\n");

    self.socket.push(data);
  });

  this.socket.resume();
  this.socket.write(command + "\r\n");
};

module.exports = NNTP;

function mergeDefaults (defaults, arguments) {
  for(var i in arguments) {
    defaults[i] = arguments[i];
  }

  return defaults;
}
