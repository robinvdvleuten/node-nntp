# NNTP

[![NPM version](https://badge.fury.io/js/node-nntp.png)](http://badge.fury.io/js/node-nntp)
[![Build Status](https://travis-ci.org/RobinvdVleuten/node-nntp.png?branch=master)](https://travis-ci.org/RobinvdVleuten/node-nntp)
[![Code Climate](https://codeclimate.com/github/RobinvdVleuten/node-nntp.png)](https://codeclimate.com/github/RobinvdVleuten/node-nntp)

## Usage

```javascript
var NNTP = require('nntp');

var nntp = new NNTP({host: 'news.php.net', port: 119, secure: false}),
    group;

nntp.connect(function (error, response) {
  if (error) {
    throw error;
  }

  nntp.group('php.doc.nl', function (error, receivedGroup) {

    nntp.overviewFormat(function (error, receivedFormat) {

      nntp.overview(receivedGroup.first + '-' + receivedGroup.last, receivedFormat, function (error, receivedMessages) {
        console.log(receivedMessages);
      });
    });
  });
});
```
