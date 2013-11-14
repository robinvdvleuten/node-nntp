## Usage

```javascript
var NNTP = require('nntp')

var nntp = new NNTP('news.php.net', 119),
    group,
    format;

nntp.connect()
.then(function (response) {
  console.log('Successfully connected');
  return nntp.group('php.doc.nl');
})
.then(function (receivedGroup) {
  group = receivedGroup;
  return nntp.overviewFormat();
})
.then(function (receivedFormat) {
  format = receivedFormat;
  return nntp.overview(group.first + '-' + group.last, format);
})
.then(function (receivedMessages) {
  console.log('Received ' + receivedMessages.length + ' messages');
});
```
