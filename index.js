/*!
 * litelog: log.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
'use strict';
const utils = require('./lib/utils');
const Logger = require('./lib/logger');
const LogStream = require('./lib/logstream');

exports.create = Logger.create;
exports.end = Logger.end;
exports.getTime = utils.getTime;
exports.Logger = Logger;
exports.LogStream = LogStream;
exports.formatLog = Logger.formatLog;
exports.STDOUT = process.stdout;
exports.STDERR = process.stderr;
