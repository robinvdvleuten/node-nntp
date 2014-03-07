var assert = require('assert'),
    net = require('net'),
    NNTP = require('../lib/nntp'),
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
        nntp.connect(function (error, response) {
          nntp.authenticate(function (error, response) {
            assert.equal(null, error);
            assert.equal(response.status, 281);
            assert.equal(response.message, 'Authentication accepted');

            done();
          });
        });
      });
    });
  });
});
