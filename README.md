# NNTP

Client for communicating with servers through the Network News Transfer Protocol (NNTP) protocol.

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
var co = require('co'),
    NNTP = require('node-nntp');

co(function *() {
  var nntp = new NNTP({host: 'news.php.net', port: 119, secure: false});

  var response = yield nntp.connect(),
      group = yield nntp.group('php.doc.nl'),
      format = yield nntp.overviewFormat();

  var messages = yield nntp.xover(group.first + '-' + (parseInt(group.first, 10) + 100), format);
})();
```

## License

MIT, see LICENSE
