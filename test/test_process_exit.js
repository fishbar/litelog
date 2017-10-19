var Log = require('../');
var fs = require('xfs');
var expect = require('expect.js');
var path = require('path');


var log = Log.create({
  sys : {
    level: 'DEBUG',
    file : path.join(__dirname, '../logs/exit.%minute%.log'),
    rotation: 1
  }
});

setInterval(function () {
  log.info('hello');
}, 10);
