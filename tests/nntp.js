'use strict';

var assert = require('assert'),
    net = require('net'),
    zlib = require('zlib'),
    NNTP = require('../lib/nntp'),
    server;

var PORT = 3000;

function createServer(messages, callback) {
  if (typeof messages === 'function') {
    callback = messages;
    messages = [];
  }

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

  server.listen(PORT, callback);
}

describe('NNTP', function () {
  describe('#connect()', function () {
    it('should return a response when connection is successful', function (done) {
      createServer(function () {
        var nntp = new NNTP({host: 'localhost', port: PORT});

        nntp.connect(function (error, response) {
          assert.equal(null, error);
          assert.equal(response.status, 200);
          assert.equal(response.message, 'server ready - posting allowed');

          done();
        });
      });
    });

    it('should return an error when connection is unsuccessful', function (done) {
      createServer(function () {
        var nntp = new NNTP({host: 'localhost', port: 6000});

        nntp.connect(function (error, response) {
          assert.notEqual(null, error);
          assert.equal(error.message.indexOf('connect ECONNREFUSED'), 0);
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
        var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user'});

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

    it('should return a response when authentication with password is successful', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' },
        { request: 'AUTHINFO PASS pass\r\n', response: '281 Authentication accepted' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user', password: 'pass'});

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

    it ('should return an error when authentication without a password', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '381 Password needed' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user'});

        nntp.connect(function (error, response) {
          nntp.authenticate(function (error, response) {
            assert.notEqual(null, error);
            assert.equal(error.message, 'Password is required');
            assert.equal(null, response);

            done();
          });
        });
      });
    });
  });

  describe('#connectAndAuthenticate()', function () {
    it('should return response when connect and authenticate is successful', function (done) {
      var messages = [
        { request: 'AUTHINFO USER user\r\n', response: '281 Authentication accepted' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user'});

        nntp.connectAndAuthenticate(function (error, response) {
          assert.equal(null, error);
          assert.equal(response.status, 281);
          assert.equal(response.message, 'Authentication accepted');

          done();
        });
      });
    });

    it('should only connect when no username is given', function (done) {
      createServer(function () {
        var nntp = new NNTP({host: 'localhost', port: PORT});

        nntp.connectAndAuthenticate(function (error, response) {
          assert.equal(null, error);
          assert.equal(response.status, 200);
          assert.equal(response.message, 'server ready - posting allowed');

          done();
        });
      });
    });
  });

  describe('#xover()', function () {
    it('should return messages as array', function (done) {
      var messages = [
        { request: 'XOVER 1-1\r\n', response: '224 compressed data follows\r\n123456789\tRe: Are you checking out NNTP?\trobinvdvleuten@example.com (\"Robin van der Vleuten\")\tSat,3 Aug 2013 13:19:22 -0000\t<nntp123456789@nntp>\t<nntp987654321@nntp>\t321\t123\tXref: nntp:123456789\r\n.\r\n' }
      ];

      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: PORT});

        nntp.connect(function (error, response) {
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

          nntp.xover('1-1', format, function (error, messages) {
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

            done();
          });
        });
      });
    });
  });

  describe('#xzver()', function () {
    it('should correctly inflate received messages and return messages as array', function (done) {
      zlib.deflate('123456789\tRe: Are you checking out NNTP?\trobinvdvleuten@example.com (\"Robin van der Vleuten\")\tSat,3 Aug 2013 13:19:22 -0000\t<nntp123456789@nntp>\t<nntp987654321@nntp>\t321\t123\tXref: nntp:123456789\r\n.\r\n', function (error, result) {
        var messages = [
          { request: 'XZVER 1-1\r\n', response: '224 compressed data follows\r\n' + result.toString('binary') }
        ];

        createServer(messages, function () {
          var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user'});

          nntp.connect(function (error, response) {
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

            nntp.xzver('1-1', format, function (error, messages) {
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

              done();
            });
          });
        });
      });
    });
  });

  describe('#article()', function(){
    it('should retrieve an article', function(done){
      var messages = [ {
        request: 'ARTICLE <nntp123456789@nntp>\r\n',
        response: '220 1 <nntp1234567890@nntp>\r\nNewsgroups: alt.test\r\nDate: 6 Oct 1998 04:38:40 -0500\r\nMessage-ID: <nntp1234567890@nntp>\r\n\r\ntest\r\n.\r\n'
      } ];
      createServer(messages, function () {
        var nntp = new NNTP({host: 'localhost', port: PORT, username: 'user'});

        nntp.connect(function (error, response) {
          nntp.article('<nntp123456789@nntp>', function (error, article) {
            assert(article.headers.length > 0);
            assert(article.body.length > 0);
            assert.equal(article.body[0], 'test');
            done();
          });
        });
      });
    });
  });
});
