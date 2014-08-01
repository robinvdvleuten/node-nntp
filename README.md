# NNTP

Client for communicating with servers throught the Network News Transfer Protocol (NNTP) protocol.

[![NPM version](http://img.shields.io/npm/v/node-nntp.svg?style=flat)](https://www.npmjs.org/package/node-nntp)
[![Build Status](http://img.shields.io/travis/RobinvdVleuten/node-nntp.svg?style=flat)](https://travis-ci.org/RobinvdVleuten/node-nntp)
[![Coverage Status](http://img.shields.io/coveralls/RobinvdVleuten/node-nntp.svg?style=flat)](https://coveralls.io/r/RobinvdVleuten/node-nntp)
[![Code Climate](http://img.shields.io/codeclimate/github/RobinvdVleuten/node-nntp.svg?style=flat)](https://codeclimate.com/github/RobinvdVleuten/node-nntp)
[![Gittip](http://img.shields.io/gittip/RobinvdVleuten.svg?style=flat)](https://www.gittip.com/RobinvdVleuten/)

## Installation

```bash
$ npm install node-nntp
```

## Usage

Here is an example that fetches 100 articles from the _php.doc_ of the _news.php.net_ server:

```javascript
var async = require('async'),
    NNTP = require('node-nntp');

var nntp = new NNTP({host: 'news.php.net', port: 119, secure: false}),
    group,
    format;

async.waterfall([
  function (callback) {
    nntp.connect(callback);
  },
  function (response, callback) {
    nntp.group('php.doc.nl', callback);
  },
  function (receivedGroup, callback) {
    group = receivedGroup;

    nntp.overviewFormat(callback);
  },
  function (receivedFormat, callback) {
    format = receivedFormat;

    nntp.xover(group.first + '-' + (parseInt(group.first, 10) + 100), format, callback);
  }
], function (error, messages) {
  console.log(messages);
});
```

## License

MIT, see LICENSE
