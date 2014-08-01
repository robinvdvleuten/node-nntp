var assert = require('assert'),
    net = require('net'),
    async = require('async'),
    NNTP = require('../lib/nntp'),
    server;

function createServer(messages, callback) {
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

        connection.write(message.response);
      });
    }
  });

  server.listen(5000, callback);
}

describe('NNTP', function () {
  describe('#connect()', function () {
    it('should return a response when connection is successful', function (done) {
      createServer([], function () {
        var nntp = new NNTP({host: 'localhost', port: 5000});

        nntp.connect(function (error, response) {
          assert.equal(null, error);
          assert.equal(response.status, 200);
          assert.equal(response.message, 'server ready - posting allowed');

          done();
        });
      });
    });

    it('should return an error when connection is unsuccessful', function (done) {
      createServer([], function () {
        var nntp = new NNTP({host: 'localhost', port: 6000});

        nntp.connect(function (error, response) {
          assert.notEqual(null, error);
          assert.equal(null, response);
          done();
        });
      });
    });
  });

  describe('#authenticate()', function () {
    it('should return a response when authentication is successful', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '281 Authentication accepted' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});

        async.waterfall([
          function (callback) {
            nntp.connect(callback);
          },
          function (response, callback) {
            nntp.authenticate(callback);
          },
          function (response, callback) {
            assert.equal(response.status, 281);
            assert.equal(response.message, 'Authentication accepted');

            callback();
          }
        ], function () {
          done();
        });
      });
    });

    it('should return a response when authentication with password is successful', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' },
        { request: 'AUTHINFO PASS pass\r\n', response: '281 Authentication accepted' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user', password: 'pass'});

        async.waterfall([
          function (callback) {
            nntp.connect(callback);
          },
          function (response, callback) {
            nntp.authenticate(callback);
          },
          function (response, callback) {
            assert.equal(response.status, 281);
            assert.equal(response.message, 'Authentication accepted');

            callback();
          }
        ], function () {
          done();
        });
      });
    });

    it ('should return an error when authentication without a password', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: 5000, username: 'user'});

        async.waterfall([
          function (callback) {
            nntp.connect(callback);
          },
          function (response, callback) {
            nntp.authenticate(callback);
          }
        ], function (error) {
          assert.notEqual(null, error);
          assert.equal(error.message, 'Password is required');
          done();
        });
      });
    });
  });
});
