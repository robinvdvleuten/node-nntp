var assert = require('assert'),
    net = require('net'),
    async = require('async'),
    NNTP = require('../index'),
    server;

describe('NNTP', function () {
  describe('#connect()', function () {
    it('should return a response when connection is successful', function (done) {
      if (server !== undefined) {
        server.close();
      }

      server = net.createServer(function (connection) {
        connection.write('200 server ready - posting allowed\r\n');
      });

      server.listen(5000, function () {
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
      if (server !== undefined) {
        server.close();
      }

      server = net.createServer(function (connection) {
        connection.write('200 server ready - posting allowed\r\n');
      });

      server.listen(5000, function () {
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
      if (server !== undefined) {
        server.close();
      }

      server = net.createServer(function (connection) {
        connection.write('200 server ready - posting allowed\r\n');

        connection.on('data', function (data) {
          data = data.toString('utf8');
          assert.equal('AUTHINFO USER user\r\n', data);

          connection.write('281 Authentication accepted');
        });
      });

      server.listen(5000, function () {
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
      if (server !== undefined) {
        server.close();
      }

      server = net.createServer(function (connection) {
        connection.write('200 server ready - posting allowed\r\n');

        var messages = [], message;
        messages.push({ request: 'AUTHINFO USER user\r\n', response: '381 Password needed' });
        messages.push({ request: 'AUTHINFO PASS pass\r\n', response: '281 Authentication accepted' });

        connection.on('data', function (data) {
          data = data.toString('utf8');

          message = messages.shift();
          assert.equal(message.request, data);

          connection.write(message.response);
        });
      });

      server.listen(5000, function () {
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
  });
});
