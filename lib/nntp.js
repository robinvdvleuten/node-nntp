var util = require('util')
  , events = require('events')
  , Socket = require('./socket');

var defaults = {
  host: 'localhost',
  port: 119,
  secure: false,
};

function NNTP (options) {
  this.options = mergeDefaults(defaults, options || {});
  this.socket = new Socket(this.options.host, this.options.port, this.options.secure);
}

NNTP.prototype.authenticate = function (callback) {
  var self = this;

  this.authInfo('USER', this.options.username, function (error, response) {
    if (response.status === 381) {
      if (!self.options.password) {
        return callback(new Error('Password is required'));
      }

      return self.authInfo('PASS', self.options.password, callback);
    }

    callback(null, response);
  });
};

NNTP.prototype.connect = function (callback) {
  var self = this;

  this.socket.once('connection', function (response) {
    callback(null, response);
  });

  this.socket.once('error', callback);

  this.socket.connect();
};

NNTP.prototype.close = function () {
  this.socket.destroy();
};

NNTP.prototype.authInfo = function (type, value, callback) {
  this.socket.once('response', function (response) {
    callback(null, response);
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

  this.socket.sendCommand('GROUP ' + group);
};

NNTP.prototype.overview = function (range, format, callback) {
  this.socket.once('response', function (response) {
    var messageStrings = response.buffer.toString('utf8').split('\r\n'),
        messages = [];

    for (var i in messageStrings) {
      var messageParts = messageStrings[i].split('\t'),
          message = {};

      for (var field in format) {
        message[field] = messageParts.shift();
      }

      messages.push(message);
    }

    callback(null, messages);
  });

  this.socket.sendCommand('XOVER ' + range, true);
};

NNTP.prototype.overviewFormat = function (callback) {
  this.socket.once('response', function (response) {
    var formatParts = response.buffer.toString('utf8').split('\r\n'),
        format = {number: false};

    for (var i in formatParts) {
      if (formatParts[i].substr(-5, 5).toLowerCase() === ':full') {
        format[formatParts[i].slice(0, -5).toLowerCase()] = true;
      }
      else {
        format[formatParts[i].slice(0, -1).toLowerCase()] = false;
      }
    }

    callback(null, format);
  });

  this.socket.sendCommand('LIST OVERVIEW.FMT', true);
};

module.exports = NNTP;

function mergeDefaults (defs, args) {
  for(var i in args) {
    defs[i] = args[i];
  }

  return defs;
}
