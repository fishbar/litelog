/*!
 * litelog: log.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
'use strict';

var fs = require('xfs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var colors = {
  DEBUG: 36,
  TRACE: 32,
  INFO: 34,
  WARN: 33,
  ERROR: 31,
  FATAL: 35,
  BLACK: 30,
  RED: 31,
  GREEN: 32,
  YELLOW: 33,
  BLUE: 34,
  WHITE: 37,
};
// log 配置
var logConfig;
// log 实例
var instances = {};
var defaultLog = null;

/* close streams
process.on('exit', function () {
  for (var i in instances) {
    instances[i]._stream.end('');
  }
  instances = null;
  defaultLog = null;
});
*/

function fixZero(num) {
  return num > 9 ? num : '0' + num;
}

function getTime(d) {
  var t = d || new Date();
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
  // fix = fix ? fix : 0;
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

var head = '\x1B[';
var foot = '\x1B[0m';

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

function color(type, info) {
  var cc = colors[type] + 'm';
  return head + cc + info + foot;
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

Logger.DEBUG = 0;
Logger.TRACE = 1;
Logger.INFO = 2;
Logger.WARN = 3;
Logger.ERROR = 4;
Logger.FATAL = 5;
Logger.OFF = 6;

Logger.prototype = {
  depth: 4,
  _log: function (type, depth, msgs, pos) {
    if (Logger[type] < this._level) {
      return;
    }
    pos = pos || getPos(depth).substr(this._root.length);
    this._stream.write(exports.formatLog(this.fmt, this._colorful, type, this._name, pos, msgs));
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
    return obj.color(obj.level, obj.time() + ' ' + obj.level) + ' #' + obj.pid + ' ' + obj.type + ' (' + obj.pos + ') ' + obj.msg;
  },
  setFormatter: function (fmt) {
    this.fmt = fmt;
  },
  color: color
};

/**
 * LogStream
 * @param {Object} options
 * options {
 *   file: log_path, support variable : %year% , %month% , %day% , %hour% , %minute% , %pid%
 *   encoding : utf8
 *   mode : 0666,
 *   cork:
 * }
 */
function LogStream(options) {
  options = options || {};
  if (options.file === process.stdout || options.file === process.stderr) {
    this.filename = options.file;
  } else {
    this.nameformat = options.file;
  }
  this.remain = options.remain;
  this.flagCork = options.cork;
  this.duration = this.getDuration(options.file);
  this.encoding = options.encoding || 'utf8';
  this.streamMode = options.mode || '0666';
  this.cut();
  this.startTimer();
  var self = this;
  if (options.cork) {
    this.corkInterval = setInterval(function () {
      if (self.flagStd) {
        return;
      }
      if (!self.stream) {
        return;
      }
      self.stream.uncork();
      self.stream.cork();
    }, options.cork);
  }
}
util.inherits(LogStream, EventEmitter);

LogStream.prototype.getDuration = function (str) {
  if (typeof str !== 'string') {
    return 1;
  }
  if (/%minute%/.test(str)) {
    return 1;
  } else {
    return 60;
  }
};

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
LogStream.prototype.end = function (cb) {
  var stream = this.stream;
  if (stream === process.stdout || stream === process.stderr) {
    cb && cb();
    return;
  }
  if (this.corkInterval) {
    clearInterval(this.corkInterval);
  }
  // avoid call stream.end twice
  if (stream) {
    stream.end(function () {
      if (stream.close) {
        stream.close(cb);
      } else if (cb) {
        cb();
      }
    });
  } else if (cb) {
    cb();
  }
};

LogStream.prototype.cut = function () {
  var oldstream = this.stream;
  var logpath;
  var newname;
  if (this.stream === process.stdout || this.stream === process.stderr) {
    return;
  }
  if (this.filename === process.stdout || this.filename === process.stderr) {
    this.stream = this.filename;
    this.flagStd = true;
  } else {
    newname = this.calculateFileName();
    if (this.filename === newname) {
      return;
    }
    this.filename = newname;
    logpath = newname;
    // touch file
    if (!fs.existsSync(logpath)) {
      fs.sync().save(logpath, '');
    }
    this.stream = fs.createWriteStream(logpath, {flags: 'a'});
    if (this.flagCork) {
      this.stream.cork();
    }
    this.onCut && this.onCut(newname);
  }
  /*
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
  */
  if (oldstream && oldstream !== process.stdout && oldstream !== process.stderr) {
    oldstream.removeAllListeners();
    oldstream.uncork();
    oldstream.end(function () {
      if (oldstream.close) {
        oldstream.close();
      }
    });
  }
  this.rotate();
};

LogStream.prototype.rotate = function () {
  if (!this.remain) {
    return;
  }
  if (this.stream === process.stdout || this.stream === process.stderr) {
    return;
  }
  var self = this;
  var r = this.remain + 1;
  var stop = r + 3;
  function unlinkCb(tmp) {
    return function (err) {
      if (err && err.code !== 'ENOENT') {
        self.write('\n-------- rotate file error: ' + tmp + ' err:' + err.message + '\n');
      }
    };
  }
  var tmp;
  for (; r < stop; r++) {
    tmp = this.calculateFileName(r);
    fs.unlink(tmp, unlinkCb(tmp));
  }
};

LogStream.prototype.calculateFileName = function (remain) {
  var nameformat = this.nameformat;
  var date = new Date();
  if (remain) {
    if (/%minute%/.test(nameformat)) {
      date.setMinutes(date.getMinutes() - remain);
    } else if (/%hour%/.test(nameformat)) {
      date.setHours(date.getHours() - remain);
    } else if (/%day%/.test(nameformat)) {
      date.setDate(date.getDate() - remain);
    } else if (/%month%/.test(nameformat)) {
      date.setMonth(date.getMonth() - remain);
    } else if (/%year%/.test(nameformat)) {
      date.setYear(date.getFullYear() - remain);
    }
  }

  var year = date.getFullYear();
  var month = fixZero(date.getMonth() + 1);
  var day = fixZero(date.getDate());
  var hour = fixZero(date.getHours());
  var minute = fixZero(date.getMinutes());

  return nameformat
    .replace(/%year%/g, year)
    .replace(/%month%/g, month)
    .replace(/%day%/g, day)
    .replace(/%hour%/g, hour)
    .replace(/%minute%/g, minute)
    .replace(/%pid%/g, process.pid);
};


LogStream.prototype.startTimer = function () {
  // duration = 2 hours
  var date = new Date();
  var now = date.getTime();

  if (this.duration === 1) {
    date.setMinutes(date.getMinutes() + 1);
  } else {
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
  }
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
exports.getTime = getTime;

exports.end = function (cb) {
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

exports.Logger = Logger;
exports.LogStream = LogStream;
exports.formatLog = formatLog;

/**
 * @deprecated
 */
exports.getFormatter = function () {
  return function () { };
};
/**
 * @deprecated
 */
exports.setFormatter = function () {
  // Logger.fmt = fmt;
};

exports.STDOUT = process.stdout;
exports.STDERR = process.stderr;
