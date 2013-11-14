var net = require('net'),
    dns = require('dns'),
    when = require('when');

function NNTP (host, port) {
  this.host = host;
  this.port = port;
};

NNTP.prototype.connect = function () {
  var deferred = when.defer();
  var that = this;

  dns.lookup(this.host, function (error, address, family) {
    that.client = net.connect({host: address, port: that.port});
    that.client.setEncoding('utf8');

    that.client.once('data', function (data) {
      var response = that.createResponseFromString(data);
      deferred.resolve(response);
    });
  });

  return deferred.promise;
};

NNTP.prototype.group = function (group) {
  var deferred = when.defer();

  this.sendCommand('GROUP ' + group)
  .then(function (response) {
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

  this.sendCommand('XOVER ' + range, true)
  .then(function (response) {
    var messageStrings = response.buffer.split('\r\n'),
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

  this.sendCommand('LIST OVERVIEW.FMT', true)
  .then(function (response) {
    var formatParts = response.buffer.split('\r\n'),
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

NNTP.prototype.sendCommand = function (command, multiline) {
  var multiline = multiline || false;

  var deferred = when.defer();
  var that = this;

  this.client.once('data', function (data) {
    var response = that.createResponseFromString(data);

    if (multiline) {
      var buff = '';

      return that.client.on('data', function (data) {
        buff += data;

        if (buff.indexOf('\.\r\n') == -1) return;

        // Remove '\r\n\.\r\n' at the end of the buffer
        response.buffer = buff.slice(0, buff.length - 5);
        that.client.removeAllListeners('data');

        deferred.resolve(response);
      });
    }

    deferred.resolve(response);
  });

  this.client.write(command + '\r\n');
  return deferred.promise;
};

module.exports = NNTP;
