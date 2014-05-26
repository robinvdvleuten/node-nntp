var xtend = require('xtend'),
    Q = require('q'),
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

NNTP.prototype.authenticate = function () {
  var self = this;

  return this.authInfo('USER', this.options.username)
    .then(function (response) {
      if (response.status === 381) {
        if (!self.options.password) {
          throw new Error('Password is required');
        }

        return self.authInfo('PASS', self.options.password);
      }

      return response;
    });
};

NNTP.prototype.connect = function (callback) {
  var deferred = Q.defer();

  this.socket.once('response', function (response) {
    deferred.resolve(response);
  });

  this.socket.once('error', function (error) {
    deferred.reject(error);
  });

  this.socket.connect();

  return deferred.promise;
};

NNTP.prototype.close = function () {
  this.socket.destroy();
};

NNTP.prototype.authInfo = function (type, value) {
  var deferred = Q.defer();

  this.socket.once('response', function (response) {
    deferred.resolve(response);
  });

  this.socket.once('error', function (error) {
    deferred.reject(error);
  });

  this.socket.sendCommand('AUTHINFO ' + type + ' ' + value);

  return deferred.promise;
};

NNTP.prototype.group = function (group) {
  var deferred = Q.defer();

  this.socket.once('response', function (response) {
    var messageParts = response.message.split(' ');

    deferred.resolve({
      name:  messageParts[3],
      count: parseInt(messageParts[0], 10),
      first: parseInt(messageParts[1], 10),
      last:  parseInt(messageParts[2], 10),
    });
  });

  this.socket.once('error', function (error) {
    deferred.reject(error);
  });

  this.socket.sendCommand('GROUP ' + group);

  return deferred.promise;
};

NNTP.prototype.overview = function (range, format) {
  var deferred = Q.defer();

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
      deferred.resolve(messages);
    });
  });

  this.socket.once('error', function (error) {
    deferred.reject(error);
  });

  this.socket.sendCommand('XOVER ' + range, true);

  return deferred.promise;
};

NNTP.prototype.overviewFormat = function () {
  var deferred = Q.defer();

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
      deferred.resolve(format);
    });
  });

  this.socket.once('error', function (error) {
    deferred.reject(error);
  });

  this.socket.sendCommand('LIST OVERVIEW.FMT', true);

  return deferred.promise;
};

module.exports = NNTP;
