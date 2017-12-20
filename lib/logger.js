'use strict';

const LogStream = require('./logstream');
const util = require('util');
const fs = require('xfs');
const utils = require('./utils');
const color = utils.color;
const getTime = utils.getTime;

function getPos() {
  let tmp = {};
  Error.captureStackTrace(tmp, Logger.prototype._log);
  let stack = tmp.stack.split(/\n/g);
  let line = stack[2].split(/ /g).pop();
  if (line[0] === '(') {
    line = line.substring(1, line.length - 1);
  }
  return line;
}

var formatRegExp = /%[sdj%]/g;
function formatMsg() {
  var i;
  var tmp;
  var args = arguments;
  if (typeof args[0] !== 'string') {
    var objects = [];
    for (i = 0; i < args.length; i++) {
      tmp = args[i];
      objects.push(util.isObject(tmp) ? util.inspect(tmp) : tmp);
    }
    return objects.join(' ');
  }

  var len = args.length;
  i = 1;
  var str = String(args[0]).replace(formatRegExp, function (x) {
    if (x === '%%') {
      return '%';
    }
    if (i >= len) {
      return x;
    }
    var s;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          s = JSON.stringify(args[i++]);
        } catch (e) {
          s = '[Circular]';
        }
        return s;
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (util.isNull(x) || !util.isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + util.inspect(x);
    }
  }
  return str;
}

function formatLog(fmt, colorful, level, type, pos, msgs) {
  var msg = formatMsg.apply(null, msgs);
  var pid = process.pid;

  // custom log formatter
  let obj = {
    level: level,
    pid: pid,
    type: type,
    pos: pos,
    msg: msg,
    color: colorful ? color : function (level, msg) {
      return msg;
    },
    time: getTime
  };
  return fmt(obj) + '\n';
}

let defaultLog = null;
// log 配置
let logConfig;
// log 实例
let instances = {};

function Logger(name, cfg) {
  if (!(this instanceof Logger)) {
    return defaultLog.get(name);
  }
  var self = this;
  this._root = process.cwd() + '/';
  this._colorful = false;
  this._name = name;
  this._level = Logger[cfg.level ? cfg.level : 'WARN'];
  this.logFile = cfg.file;
  this._stream = new LogStream({
    file: cfg.file || process.stdout,
    cork: cfg.cork,
    mode: cfg.mode,
    remain: cfg.rotation || cfg.remain
  });
  this._stream.onCut = function (filename) {
    self.logFile = filename;
    cfg.onCut && cfg.onCut(filename);
  };

  if (cfg.fmt) {
    this.fmt = cfg.fmt;
  }
  // alias literal => write
  this.write = this.literal;
}

Logger.prototype = {
  _log: function (type, msgs, pos) {
    if (Logger[type] < this._level) {
      return;
    }
    pos = pos || getPos().substr(this._root.length);
    this._stream.write(formatLog(this.fmt, this._colorful, type, this._name, pos, msgs));
  },
  literal: function (msg) {
    this._stream.write(msg + '\n');
  },
  debug: function () {
    this._log('DEBUG', arguments);
  },
  trace: function () {
    this._log('TRACE', arguments);
  },
  info: function () {
    this._log('INFO', arguments);
  },
  warn: function () {
    this._log('WARN', arguments);
  },
  error: function () {
    this._log('ERROR', arguments);
  },
  fatal: function () {
    this._log('FATAL', arguments);
  },
  get: function (name) {
    var log = instances[name];
    if (!log) {
      /* eslint-disable no-alert, no-console */
      console.error(
        name ?
          '[litelog] can not find log :' + name + ', using default log' :
          '[litelog] using default log'
        );
      /* eslint-enable no-alert, no-console */
      log = defaultLog;
    }
    if (defaultLog === null) {
      throw new Error('litelog not init or litelog had been destroyed');
    }
    return log;
  },
  getStream: function () {
    return this._stream.stream;
  },
  setRoot: function (root) {
    if (!/\/$/.test(root)) {
      root += '/';
    }
    this._root = root;
  },
  colorful: function (bool) {
    this._colorful = bool;
  },
  // time: getTime,
  getTime: getTime,
  end: function (cb) {
    this._stream.end(cb);
  },
  fmt: function (obj) {
    return obj.color(obj.level, obj.time() + ' ' + obj.level) + ' #' + obj.pid + ' ' + obj.type + ' ' + obj.msg + ' (' + obj.pos + ')';
  },
  setFormatter: function (fmt) {
    this.fmt = fmt;
  },
  getFormatter: function () {
    return this.fmt;
  },
  color: color
};

Logger.DEBUG = 0;
Logger.TRACE = 1;
Logger.INFO = 2;
Logger.WARN = 3;
Logger.ERROR = 4;
Logger.FATAL = 5;
Logger.OFF = 6;

/**
 * [create description]
 * @param  {String|Path} logcfg can be a configString, or a config.json parth
 * @return {Log}    default Log instances
 */
Logger.create = function (logcfg) {
  if (typeof logcfg === 'string') {
    // log file, json format
    logConfig = fs.readFileSync(logcfg);
    try {
      logConfig = JSON.parse(logConfig);
    } catch (e) {
      e.message = 'litelog parse logconfig file error ' + e.message;
      throw e;
    }
  } else {
    logConfig = logcfg;
  }
  if (!logConfig) {
    throw new Error('litelog config error, config is empty');
  }
  var count = 0;
  for (var i in logConfig) {
    count++;
    instances[i] = new Logger(i, logConfig[i]);
    if (!defaultLog) {
      defaultLog = instances[i];
    }
  }
  if (count === 0) {
    instances['_'] = new Logger('_', {file: process.stdout, level: 'DEBUG'});
    defaultLog = instances['_'];
  }
  return defaultLog;
};

Logger.end = function (cb) {
  var keys = Object.keys(instances);
  var total = keys.length;
  var count = 0;
  var flagCallback = false;
  function done() {
    count++;
    if (count >= total && !flagCallback) {
      flagCallback = true;
      cb && cb();
    }
  }
  for (var i in instances) {
    instances[i]._stream.end(done);
  }
  instances = {};
  defaultLog = null;
};

Logger.formatLog = formatLog;
Logger.defaultLog = defaultLog;

module.exports = Logger;
