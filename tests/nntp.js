'use strict';

var assert = require('assert'),
    net = require('net'),
    async = require('async'),
    zlib = require('zlib'),
    thunkify = require('thunkify'),
    NNTP = require('../lib/nntp'),
    server;

function createServer(messages) {
  messages = messages || [];

  return function (fn) {
    if (server !== undefined) {
      server.close();
    }

    server = net.createServer(function (connection) {
      connection.write('200 server ready - posting allowed\r\n');

      if (messages.length > 0) {
        var message;

        connection.on('data', function (data) {
          data = data.toString('utf8');

          message = messages.shift();
          assert.equal(message.request, data);

          connection.write(new Buffer(message.response, 'binary'));
        });
      }
    });

    server.listen(5000, fn);
  };
}

describe('NNTP', function () {
  describe('#connect()', function () {
    it('should return a response when connection is successful', function *() {
      yield createServer();

      var nntp = new NNTP({host: 'localhost', port: 5000});

      var response = yield nntp.connect();
      assert.equal(response.status, 200);
      assert.equal(response.message, 'server ready - posting allowed');
    });

    it('should return an error when connection is unsuccessful', function *() {
      yield createServer();

      var nntp = new NNTP({host: 'localhost', port: 6000}),
          catchedError;

      try {
        yield nntp.connect();
      } catch (error) {
        catchedError = error;
      }

      assert.notEqual(undefined, catchedError);
      assert.equal(catchedError.message, 'connect ECONNREFUSED');
    });
  });

  describe('#authenticate()', function () {
    it('should return a response when authentication is successful', function *() {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '281 Authentication accepted' }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});
      yield nntp.connect();

      var response = yield nntp.authenticate();
      assert.equal(response.status, 281);
      assert.equal(response.message, 'Authentication accepted');
    });

    it('should return a response when authentication with password is successful', function *() {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' },
        { request: 'AUTHINFO PASS pass\r\n', response: '281 Authentication accepted' }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user', password: 'pass'});
      yield nntp.connect();

      var response = yield nntp.authenticate();
      assert.equal(response.status, 281);
      assert.equal(response.message, 'Authentication accepted');
    });

    it ('should return an error when authentication without a password', function *() {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});
      yield nntp.connect();

      var catchedError;

      try {
        yield nntp.authenticate();
      } catch (error) {
        catchedError = error;
      }

      assert.notEqual(undefined, catchedError);
      assert.equal(catchedError.message, 'Password is required');
    });
  });

  describe('#connectAndAuthenticate()', function () {
    it('should return response when connect and authenticate is successful', function *() {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '281 Authentication accepted' }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});

      var response = yield nntp.connectAndAuthenticate();
      assert.equal(response.status, 281);
      assert.equal(response.message, 'Authentication accepted');
    });

    it('should only connect when no username is given', function *() {
      yield createServer();

      var nntp = new NNTP({host: 'localhost', port: 5000});

      var response = yield nntp.connectAndAuthenticate();
      assert.equal(response.status, 200);
      assert.equal(response.message, 'server ready - posting allowed');
    });
  });

  describe('#xover()', function () {
    it('should return messages as array', function *() {
      var messages = [
        { request: 'XOVER 1-1\r\n', response: '224 compressed data follows\r\n123456789\tRe: Are you checking out NNTP?\trobinvdvleuten@example.com (\"Robin van der Vleuten\")\tSat,3 Aug 2013 13:19:22 -0000\t<nntp123456789@nntp>\t<nntp987654321@nntp>\t321\t123\tXref: nntp:123456789\r\n.\r\n' }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000});
      yield nntp.connect();

      var format = {
        subject: false,
        from: false,
        date: false,
        'message-id': false,
        references: false,
        bytes: false,
        lines: false,
        xref: true
      };

      var messages = yield nntp.xover('1-1', format);
      assert.equal(1, messages.length);

      var message = messages.shift();
      assert.equal('123456789', message.number);
      assert.equal('Re: Are you checking out NNTP?', message.subject);
      assert.equal('robinvdvleuten@example.com ("Robin van der Vleuten")', message.from);
      assert.equal('Sat,3 Aug 2013 13:19:22 -0000', message.date);
      assert.equal('<nntp123456789@nntp>', message['message-id']);
      assert.equal('<nntp987654321@nntp>', message.references);
      assert.equal('321', message.bytes);
      assert.equal('123', message.lines);
      assert.equal('nntp:123456789', message.xref);
    });
  });

  describe('#xzver()', function () {
    it('should correctly inflate received messages and return messages as array', function *() {
      var result = yield thunkify(zlib.deflate)('123456789\tRe: Are you checking out NNTP?\trobinvdvleuten@example.com (\"Robin van der Vleuten\")\tSat,3 Aug 2013 13:19:22 -0000\t<nntp123456789@nntp>\t<nntp987654321@nntp>\t321\t123\tXref: nntp:123456789\r\n.\r\n');

      var messages = [
        { request: 'XZVER 1-1\r\n', response: '224 compressed data follows\r\n' + result.toString('binary') }
      ];

      yield createServer(messages);

      var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});
      yield nntp.connect();

      var format = {
        subject: false,
        from: false,
        date: false,
        'message-id': false,
        references: false,
        bytes: false,
        lines: false,
        xref: true
      };

      var messages = yield nntp.xzver('1-1', format);
      assert.equal(1, messages.length);

      var message = messages.shift();
      assert.equal('123456789', message.number);
      assert.equal('Re: Are you checking out NNTP?', message.subject);
      assert.equal('robinvdvleuten@example.com ("Robin van der Vleuten")', message.from);
      assert.equal('Sat,3 Aug 2013 13:19:22 -0000', message.date);
      assert.equal('<nntp123456789@nntp>', message['message-id']);
      assert.equal('<nntp987654321@nntp>', message.references);
      assert.equal('321', message.bytes);
      assert.equal('123', message.lines);
      assert.equal('nntp:123456789', message.xref);
    });
  });
});
