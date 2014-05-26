# NNTP

Client for communicating with servers throught the Network News Transfer Protocol (NNTP) protocol.

[![NPM version](https://badge.fury.io/js/node-nntp.png)](http://badge.fury.io/js/node-nntp)
[![Build Status](https://travis-ci.org/RobinvdVleuten/node-nntp.png?branch=master)](https://travis-ci.org/RobinvdVleuten/node-nntp)
[![Code Climate](https://codeclimate.com/github/RobinvdVleuten/node-nntp.png)](https://codeclimate.com/github/RobinvdVleuten/node-nntp)

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
