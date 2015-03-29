var config = exports;
exports.constructor = function () {};

var fs = require('fs');

config.get = function() {
  return JSON.parse(fs.readFileSync('config.json'));
};
