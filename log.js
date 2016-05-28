/*!
 * litelog: log.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
'use strict';

var fs = require('xfs'),
  util = require('util'),
  path = require('path'),
  EventEmitter = require('events').EventEmitter,
  colors = {
    DEBUG : 36,
    TRACE : 32,
    INFO  : 34,
    WARN  : 33,
    ERROR : 31,
    FATAL : 35
  },
  // log 配置
  logConfig,
  // log 实例
  instances = {},
  defaultLog = null;

// close streams
process.on('exit', function () {
  for (var i in instances) {
    instances[i]._stream.end('');
  }
  instances = null;
  defaultLog = null;
});

function fixZero(num) {
  return num > 9 ? num : '0' + num;
}

function getTime() {
  var t = new Date();
  var Y = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  var H = t.getHours();
  var M = t.getMinutes();
  var S = t.getSeconds();
  var s = t.getMilliseconds();

  return Y + ' ' +
    (H > 9 ? H : ('0' + H)) + ':' +
    (M > 9 ? M : ('0' + M)) + ':' +
    (S > 9 ? S : ('0' + S)) + '.' +
    (s > 99 ? s : (s > 9 ? '0' + s : ('00' + s)));
}

function getPos(fix) {
  //fix = fix ? fix : 0;
  // var e = new Error();
  var stack = new Error().stack.split('\n');
  var line = stack[fix];
  var lastSpace = line.lastIndexOf(' ');
  line = line.substring(lastSpace + 1, line.length);
  if (line[0] === '(') {
    line = line.substring(1, line.length - 1);
  }
  return line;
}

var head = '\x1B[', foot = '\x1B[0m';

var formatRegExp = /%[sdj%]/g;
function formatMsg() {
  var i, tmp, args = arguments;
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
    let s;
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

function formatLog(colorful, fmt, type, name, pos, msgs) {
  var color = colors[type] + 'm';
  var msg = formatMsg.apply(null, msgs);
  var clevel = colorful ? (head + color + type + foot) : type;
  var pid = process.pid;

  if (fmt) {
    // custom log formatter
    return fmt({
      level: clevel,
      pid: pid,
      type: name,
      pos: pos,
      msg: msg,
      time: getTime
    }) + '\n';
  } else {
    return getTime() + ' ' + clevel + ' #' + pid + ' ' + name + ' (' + pos + ') ' + msg + '\n';
  }
}

function Logger(name, cfg) {
  if (!this instanceof Logger) {
    return defaultLog.get(name);
  }
  this._root = process.cwd() + '/';
  this._colorful = false;
  this._name = name;
  this._fmt = cfg.formatter;
  this._level = Logger[cfg.level ? cfg.level : 'WARN'];
  this.logFile = cfg.file;
  this._stream = new LogStream({file: cfg.file || process.stdout, duration: cfg.duration});
  this._stream.onCut = function (filename) {
    self.logFile = filename;
    cfg.onCut && cfg.onCut(filename);
  };
}

Logger.DEBUG = 0;
Logger.TRACE = 1;
Logger.INFO = 2;
Logger.WARN = 3;
Logger.ERROR = 4;
Logger.FATAL = 5;
Logger.OFF = 6;

Logger.prototype = {
  depth: 4,
  _log: function (type, depth, msgs) {
    if (Logger[type] < this._level) {
      return;
    }
    let pos = getPos(depth).substr(this._root.length);
    this._stream.write(formatLog(this._colorful, this._fmt, type, this._name, pos, msgs));
  },
  literal: function (msg) {
    this._stream.write(msg + '\n');
  },
  debug: function () {
    this._log('DEBUG', 4, arguments);
  },
  trace: function () {
    this._log('TRACE', 4, arguments);
  },
  info: function () {
    this._log('INFO', 4, arguments);
  },
  warn: function () {
    this._log('WARN', 4, arguments);
  },
  error: function () {
    this._log('ERROR', 4, arguments);
  },
  fatal: function () {
    this._log('FATAL', 4, arguments);
  },
  get: function (name) {
    var log = instances[name];
    if (!log) {
      /* eslint-disable no-alert, no-console */
      console.error('[litelog] can not find log :' + name + ', using default log');
      /* eslint-enable no-alert, no-console */
      log = defaultLog;
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
  time: getTime,
  end: function () {
    this._stream.end();
  }
};

/**
 * LogStream
 * @param {Object} options
 * options {
 *   file: log_path, support variable : %year% , %month% , %day% , %hour% , %pid%
 *   encoding : utf8
 *   mode : 0666
 *   duration : 2  unit hour, and  24 % duration = 0 ,min=1, max=24
 * }
 */
function LogStream(options) {
  options = options || {};
  if (options.file === process.stdout || options.file === process.stderr) {
    this.filename = options.file;
  } else {
    this.logdir = path.dirname(options.file.match(/^\//) ? options.file : path.join(options.file));
    this.nameformat = options.file.match(/[^\/]+$/);
    this.nameformat = this.nameformat ? this.nameformat[0] : 'info.%year%-%month%-%day%.log';
    this.nameformat = this.nameformat.replace('%pid%', process.pid);
  }
  this.duration = parseInt(options.duration, 10);
  if (isNaN(this.duration) || (24 % this.duration) !== 0 || this.duration > 24 || this.duration < 1) {
    this.duration = 2;
  }
  this.encoding = options.encoding || 'utf8';
  this.streamMode = options.mode || '0666';
  this.cut();
  this.startTimer();
}
util.inherits(LogStream, EventEmitter);
LogStream.prototype.write = function (string, encoding) {
  var st = this.stream;
  try {
    st.write(string, encoding);
  } catch (e) {
    /* eslint-disable no-alert, no-console */
    console.error('[litelog] try write when stream closed', this.filename, string);
    /* eslint-enable no-alert, no-console */
  }
};
LogStream.prototype.end = function () {
  if (this.stream === process.stdout || this.stream === process.stderr) {
    return;
  }
  // avoid call stream.end twice
  if (this.stream && this.stream.writable) {
    this.stream.removeAllListeners();
    this.stream.end();
    this.stream.destroySoon();
  }
};
LogStream.prototype.cut = function () {
  var oldstream = this.stream;
  var date = new Date();
  var year = date.getFullYear();
  var month = fixZero(date.getMonth() + 1);
  var day = fixZero(date.getDate());
  var hour = fixZero(date.getHours());
  var logpath;
  var newname;
  if (this.stream === process.stdout || this.stream === process.stderr) {
    return;
  }
  if (this.filename === process.stdout || this.filename === process.stderr) {
    this.stream = this.filename;
  } else {
    newname = this.nameformat
                .replace(/%year%/g, year)
                .replace(/%month%/g, month)
                .replace(/%day%/g, day)
                .replace(/%hour%/g, hour);
    if (this.filename === newname) {
      return;
    }
    this.filename = newname;
    logpath = path.join(this.logdir, newname);
    // touch file
    if (!fs.existsSync(logpath)) {
      fs.sync().save(logpath, '');
    }
    this.stream = fs.createWriteStream(logpath, {flags: 'a'});
    this.onCut && this.onCut(newname);
  }
  this._reopening = true;
  this.stream
    .on('error', this.emit.bind(this, 'error'))
    .on('pipe', this.emit.bind(this, 'pipe'))
    .on('drain', this.emit.bind(this, 'drain'))
    .on('open', function () {
      this._reopening = false;
    }.bind(this))
    .on('close', function () {
      if (!this._reopening) {
        this.emit('close');
      }
    }.bind(this));

  if (oldstream && oldstream !== process.stdout && oldstream !== process.stderr) {
    oldstream.removeAllListeners();
    oldstream.end();
    oldstream.destroySoon();
  }
};

LogStream.prototype.startTimer = function () {
  // duration = 2 hours
  var date = new Date();
  var now = date.getTime();
  var hour = date.getHours();
  var detHour = this.duration - hour % this.duration;

  date.setHours(hour + detHour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  var duration = date.getTime() - now;
  this._timer = setTimeout(function (self) {
    self.cut();
    self.startTimer();
  }, duration, this);
};

/**
 * [create description]
 * @param  {String|Path} logcfg can be a configString, or a config.json parth
 * @return {Log}    default Log instances
 */
exports.create = function (logcfg) {
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
    throw new Error('litelog config error');
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
exports.getTime = getTime;

exports.STDOUT = process.stdout;
exports.STDERR = process.stderr;
