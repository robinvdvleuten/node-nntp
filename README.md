## Usage

```javascript
var NNTP = require('node-nntp');

var nntp = new NNTP('news.php.net', 119),
    group,
    format;

nntp.connect(function (response) {
  console.log('Successfully connected');

  return nntp.group('php.doc.nl', function (error, receivedGroup) {
    group = receivedGroup;

    return nntp.overviewFormat(function (error, receivedFormat) {
      format = receivedFormat;

      return nntp.overview(group.first + '-' + group.last, format, function (error, receivedMessages) {
        console.log(receivedMessages);
      });
    });
  });
});

```
