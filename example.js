/*!
 * litelog: example.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
/**
 * usage
 * @type {Object}
 */
var logConfig = {
  // default log stream
  sys : {
    level : 'DEBUG',  // can be : DEBUG/TRACE/INFO/WARN/ERROR/FATAL
    file : 'STDOUT'   // can be a  abs file path, or STDERROR , or STDOUT
  },
  // another log stream
  custom: {
    level: 'INFO',
    file: './test.log',
  }
};

var Log = require('./log');

var log = Log.create(logConfig);

log.info();
log.warn();
log.error();
log.debug();


var custom = log.get('custom')
custom.debug();
custom.error();



