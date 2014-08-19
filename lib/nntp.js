'use strict';

var domain = require('domain'),
    xtend = require('xtend'),
    Response = require('./response'),
    ResponseStream = require('./streams/response'),
    MultilineStream = require('./streams/multiline'),
    CompressedStream = require('./streams/compressed');

var defaults = {
  host: 'localhost',
  port: 119,
  secure: false,
};

function NNTP (options) {
  this.options = xtend(defaults, options || {});

  var socket, self = this;

  this.connect = function () {
    return function (fn) {
      socket = require(self.options.secure ? 'tls' : 'net').connect(self.options.port, self.options.host);

      getResponse(false, false, function (error, response) {
        self.isConnected = true;
        fn(error, response);
      });
    };
  };

  /**
   * Shorthand function for connect and authenticate in one call.
   */
  this.connectAndAuthenticate = function () {
    return function (fn) {
      self.connect()(function (error, response) {
        if (error) {
          return fn(error);
        }

        if (undefined === self.options.username) {
          return fn(null, response);
        }

        self.authenticate()(fn);
      });
    };
  };

  this.disconnect = function () {
    return function (fn) {
      socket.once('end', function () {
        self.isConnected = false;
        fn();
      });

      socket.end();
    };
  };

  this.authenticate = function () {
    return function (fn) {
      self.authInfo('USER', self.options.username)(function (error, response) {
        if (error) {
          return fn(error);
        }

        if (response.status === 381) {
          if (undefined === self.options.password) {
            return fn(new Error('Password is required'));
          }

          return self.authInfo('PASS', self.options.password)(fn);
        }

        fn(null, response);
      });
    };
  };

  this.authInfo = function (type, value) {
    return function (fn) {
      getResponse(false, false, fn);

      socket.write('AUTHINFO ' + type + ' ' + value + '\r\n');
    };
  };

  this.group = function (group) {
    return function (fn) {
      getResponse(false, false, function (error, response) {
        if (error) {
          return fn(error);
        }

        if (Response.NO_SUCH_GROUP === response.status) {
          return fn(new Error('No such group'));
        }

        if (Response.GROUP_SELECTED !== response.status) {
          return fn(new Error('Unexpected response received: ' + JSON.stringify(response)));
        }

        var messageParts = response.message.split(' ');

        fn(null, {
          name:  messageParts[3],
          count: parseInt(messageParts[0], 10),
          first: parseInt(messageParts[1], 10),
          last:  parseInt(messageParts[2], 10),
        });
      });

      socket.write('GROUP ' + group + '\r\n');
    };
  };

  this.overviewFormat = function () {
    return function (fn) {
      getResponse(true, false, function (error, response) {
        if (error) {
          return fn(error);
        }

        var format = [];
        response.lines.forEach(function (line) {
          if (line.substr(-5, 5).toLowerCase() === ':full') {
            format[line.slice(0, -5).toLowerCase()] = true;
          }
          else {
            format[line.slice(0, -1).toLowerCase()] = false;
          }
        });

        fn(null, format);
      });

      socket.write('LIST OVERVIEW.FMT\r\n');
    };
  };

  this.xover = function (range, format) {
    return function (fn) {
      format = xtend({number: false}, format);

      getResponse(true, false, function (error, response) {
        if (error) {
          return fn(error);
        }

        fn(null, parseOverview(response.lines, format));
      });

      socket.write('XOVER ' + range + '\r\n');
    };
  };

  this.xzver = function (range, format) {
    return function (fn) {
      format = xtend({number: false}, format);

      getResponse(true, true, function (error, response) {
        if (error) {
          return fn(error);
        }

        fn(null, parseOverview(response.lines, format));
      });

      socket.write('XZVER ' + range + '\r\n');
    };
  };

  function getResponse(multiline, compressed, callback) {
    var d = domain.create();

    function done(error, response) {
      socket.unpipe();

      socket.removeAllListeners('data');
      socket.removeAllListeners('error');

      d.exit();

      callback(error, response);
    }

    d.on('error', function (error) {
      done(error, null);
    });

    d.run(function () {
      socket.on('error', function (error) {
        done(error, null);
      });

      var pipeable = socket;

      if (compressed) {
        pipeable = pipeable.pipe(new CompressedStream());
      }

      if (multiline) {
        pipeable = pipeable.pipe(new MultilineStream());
      }

      pipeable = pipeable.pipe(new ResponseStream(multiline));

      var response;
      pipeable.on('data', function (data) {
        response = data;
      });

      pipeable.on('end', function () {
        done(null, response);
      });
    });
  }

  function parseOverview(overview, format) {
    var messages = [];

    overview.forEach(function (line) {
      var messageParts = line.toString().split('\t'),
          message = {},
          messagePart;

      for (var field in format) {
        if (format.hasOwnProperty(field)) {
          messagePart = messageParts.shift();
          message[field] = format[field] ? messagePart.substring(messagePart.indexOf(':') + 1).trim() : messagePart;
        }
      }

      messages.push(message);
    });

    return messages;
  }
}

module.exports = NNTP;
