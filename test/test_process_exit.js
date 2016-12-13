var Log = require('../log');
var fs = require('xfs');
var expect = require('expect.js');
var path = require('path');


var log = Log.create({
  sys : {
    level: 'DEBUG',
    file : path.join(__dirname, '../logs/exit.%minute%.log'),
  }
});


setInterval(function () {
  log.info('hello');
}, 10);
