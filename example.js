/**
 * usage
 * @type {Object}
 */
var logConfig = {
  // one of the log stream
  sys : {
    level : 'DEBUG',  // can be : DEBUG/TRACE/INFO/WARN/ERROR/FATAL
    file : 'STDOUT'   // can be a  abs file path, or STDERROR , or STDOUT
  }
};

var Log = require('./log');

module.exports = Log.create(logConfig);


