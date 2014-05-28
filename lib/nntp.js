var xtend = require('xtend'),
    Socket = require('./socket');

var defaults = {
  host: 'localhost',
  port: 119,
  secure: false,
};

function NNTP (options) {
  this.options = xtend(defaults, options || {});
  this.socket = new Socket(this.options.host, this.options.port, this.options.secure);
}

NNTP.prototype.authenticate = function (callback) {
  var self = this;

  this.authInfo('USER', this.options.username, function (error, response) {
    if (error) {
      return callback(error);
    }

    if (response.status === 381) {
      if (undefined === self.options.password) {
        return callback(new Error('Password is required'));
      }

      return self.authInfo('PASS', self.options.password, callback);
    }

    callback(null, response);
  });
};

NNTP.prototype.connect = function (callback) {
  this.socket.once('response', function (response) {
    callback(null, response);
  });

  this.socket.once('error', function (error) {
    callback(error);
  });

  this.socket.connect();
};

NNTP.prototype.close = function () {
  this.socket.destroy();
};

NNTP.prototype.authInfo = function (type, value, callback) {
  this.socket.once('response', function (response) {
    callback(null, response);
  });

  this.socket.once('error', function (error) {
    callback(error);
  });

  this.socket.sendCommand('AUTHINFO ' + type + ' ' + value);
};

NNTP.prototype.group = function (group, callback) {
  this.socket.once('response', function (response) {
    var messageParts = response.message.split(' ');

    callback(null, {
      name:  messageParts[3],
      count: parseInt(messageParts[0], 10),
      first: parseInt(messageParts[1], 10),
      last:  parseInt(messageParts[2], 10),
    });
  });

  this.socket.once('error', function (error) {
    callback(error);
  });

  this.socket.sendCommand('GROUP ' + group);
};

NNTP.prototype.overview = function (range, format, callback) {
  this.socket.once('response', function (response) {
    var messages = [];

    response.on('data', function (data) {
      var messageParts = data.toString().split('\t'),
          message = {};

      for (var field in format) {
        message[field] = messageParts.shift();
      }

      messages.push(message);
    });

    response.on('end', function () {
      callback(null, messages);
    });
  });

  this.socket.once('error', function (error) {
    callback(error);
  });

  this.socket.sendCommand('XOVER ' + range, true);
};

NNTP.prototype.overviewFormat = function (callback) {
  this.socket.once('response', function (response) {
    var format = {number: false};

    response.on('data', function (data) {
      if (data.toString().substr(-5, 5).toLowerCase() === ':full') {
        format[data.toString().slice(0, -5).toLowerCase()] = true;
      }
      else {
        format[data.toString().slice(0, -1).toLowerCase()] = false;
      }
    });

    response.on('end', function () {
      callback(null, format);
    });
  });

  this.socket.once('error', function (error) {
    callback(error);
  });

  this.socket.sendCommand('LIST OVERVIEW.FMT', true);
};

module.exports = NNTP;
