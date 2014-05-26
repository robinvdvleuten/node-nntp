# NNTP

Client for communicating with servers throught the Network News Transfer Protocol (NNTP) protocol.

[![NPM version](http://img.shields.io/npm/v/node-nntp.svg)](https://www.npmjs.org/package/node-nntp)
[![Build Status](http://img.shields.io/travis/RobinvdVleuten/node-nntp.svg)](https://travis-ci.org/RobinvdVleuten/node-nntp)
[![Coverage Status](http://img.shields.io/coveralls/RobinvdVleuten/node-nntp.svg)](https://coveralls.io/r/RobinvdVleuten/node-nntp)
[![Code Climate](http://img.shields.io/codeclimate/github/RobinvdVleuten/node-nntp.svg)](https://codeclimate.com/github/RobinvdVleuten/node-nntp)

## Installation

```bash
$ npm install node-nntp
```

## Usage

Here is an example that fetches 100 articles from the _php.doc_ of the _news.php.net_ server:

```javascript
var NNTP = require('node-nntp');

var nntp = new NNTP({host: 'news.php.net', port: 119, secure: false}),
    group,
    format;

nntp.connect()
  .then(function (response) {
    return nntp.group('php.doc.nl');
  })
  .then(function (receivedGroup) {
    group = receivedGroup;

    return nntp.overviewFormat();
  .then(function (receivedFormat) {
    format = receivedFormat;

    return nntp.overview(group.first + '-' + (parseInt(group.first, 10) + 100), format);
  })
  .then(function (receivedMessages) {
    console.log(receivedMessages);
  })
  .done();
});
```

## License

MIT, see LICENSE
