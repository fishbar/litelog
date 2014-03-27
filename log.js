var fs = require('fs'),
  util = require('util'),
  path = require('path'),
  EventEmitter = require('events').EventEmitter,
  colors = {
    "DEBUG" : 36,
    "TRACE" : 35,
    "INFO"  : '',
    "WARN"  : 33,
    "ERROR" : 31,
    "FATAL" : 31
  },
  // log 配置
  logConfig,
  // log 实例
  instances = {},
  posRegExp = [/^\s+at .+$/mg, /^.*?\(?(\/.+?:\d+).*$/],
  cwd = process.cwd() + '/',
  base = path.join(__dirname, '../../../');

// close streams
process.on("exit", function () {
  for (var i in instances) {
    instances[i]._stream.end();
  }
});

function fixZero(num) {
  return num > 9 ? num : '0' + num;
}

function getTime() {
  var t = new Date();
  var Y = t.getFullYear();
  var m = t.getMonth() + 1;
  var d = t.getDate();
  var H = t.getHours();
  var i = t.getMinutes();
  var s = t.getSeconds();
  var ms = t.getMilliseconds();

  return Y + '-' +
    (m > 9 ? m : '0' + m) + '-' + 
    (d > 9 ? d : '0' + d) + ' ' +
    (H > 9 ? H : '0' + H) + ':' +
    (i > 9 ? i : '0' + i) + ':' +
    (s > 9 ? s : '0' + s) + '.' +
    (ms/1000).toFixed(3)
}

function getPos(fix) {
  fix = fix ? fix : 0;
  try {
    throw new Error();
  } catch (e) {
    return e.stack.match(posRegExp[0])[fix].replace(posRegExp[1], '$1').substr(cwd.length);
  }
}

var head = '\x1B[', foot = '\x1B[0m';

function formatLog(type, name, pos, msgs) {
  var color = colors[type] + 'm';
  var msg = util.format.apply(this, msgs);
  return '[' + getTime() + '][' + head + color + type + foot + '] ' + name + ' - ' + pos + ' ' + msg + "\n";
}

function Logger(name, cfg) {
  this._name = name;
  this._level = Logger[cfg.level ? cfg.level : 'WARN'];
  cfg.file = cfg.file ? cfg.file : process.stdout;
  this._stream = new LogStream({file: cfg.file, duration: cfg.duration});
}

Logger.DEBUG = 0;
Logger.TRACE = 1;
Logger.INFO = 2;
Logger.WARN = 3;
Logger.ERROR = 4;
Logger.FATAL = 5;
Logger.OFF = 6;

Logger.prototype = {
  _log: function (type, msgs) {
    if (Logger[type] < this._level) {
      return;
    }
    this._stream.write(formatLog(type, this._name, getPos(3), msgs));
  },
  literal: function (msg) {
    this._stream.write(msg + "\n");
  },
  debug : function () {
    this._log('DEBUG', arguments);
  },
  trace : function () {
    this._log('TRACE', arguments);
  },
  info : function () {
    this._log('INFO', arguments);
  },
  warn : function () {
    this._log('WARN', arguments);
  },
  error : function () {
    this._log('ERROR', arguments);
  },
  fatal : function () {
    this._log('FATAL', arguments);
  },
  get: function (name) {
    var log = instances[name];
    if (!log) {
      throw new Error('[liteserver] can not find log :' + name);
    }
    return log;
  },
  getStream: function () {
    return this._stream.stream;
  },
  end : function () {
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
  if (options.file === process.stdout) {
    this.filename = options.file;
  } else {
    this.logdir = path.dirname(options.file.match(/^\//) ? options.file : path.join(base, options.file));
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
  st.writable && st.write(string, encoding);
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
    this.stream = fs.createWriteStream(logpath, {flags: 'a', mode: this.streamMode});
  }
  this._reopening = true;
  this.stream
    .on("error", this.emit.bind(this, "error"))
    .on("pipe", this.emit.bind(this, "pipe"))
    .on("drain", this.emit.bind(this, "drain"))
    .on("open", function () {
      this._reopening = false;
    }.bind(this))
    .on("close", function () {
      if (!this._reopening) {
        this.emit("close");
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
 * @param  {[type]} logcfg [description]
 * @return {[type]}        [description]
 */
exports.create = function (logcfg) {
  if (typeof logcfg === 'string') {
    // log file, json format
    logConfig = fs.readFileSync(logcfg);
    try {
      logConfig = JSON.parse(logConfig.toString());
    } catch (e) {
      e.message = 'liteserver log parse logconfig file error ' + e.message;
      throw e;
    }
  } else {
    logConfig = logcfg;
  }
  var first;
  for (var i in logConfig) {
    instances[i] = new Logger(i, logConfig[i]);
    if (!first) {
      first = instances[i];
    }
  }
  return first;
};
exports.base = function (_base) {
  base = _base;
};
