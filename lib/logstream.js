'use strict';
const fs = require('xfs');
const Events = require('events');
const utils = require('./utils');
const fixZero = utils.fixZero;
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
class  LogStream extends Events {
  constructor(options) {
    super();
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
}

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

module.exports = LogStream;
