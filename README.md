# NNTP

[![Build Status](https://travis-ci.org/RobinvdVleuten/node-nntp.png?branch=master)](https://travis-ci.org/RobinvdVleuten/node-nntp)

## Usage

```javascript
var NNTP = require('nntp');

var nntp = new NNTP('news.php.net', 119),
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
