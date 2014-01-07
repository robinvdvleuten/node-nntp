var assert = require('assert'),
    net = require('net'),
    NNTP = require('../'),
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
});
