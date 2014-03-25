var Response = function (status, message) {
  this.status = status;
  this.message = message;
};

Response.createFromString = function (string) {
  var matches = /^(\d{3}) ([\S\s]+)$/g.exec(string.trim());
  if (!matches) {
    throw new Error('Invalid response given: ' + string);
  }

  if (matches[1] < 100 || matches[1] >= 600) {
    throw new Error('Invalid status code given: ' + matches[1]);
  }

  return new Response(parseInt(matches[1], 10), matches[2]);
};

module.exports = Response;