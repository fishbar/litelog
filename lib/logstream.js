'use strict';
const fs = require('xfs');
const path = require('path');
const Events = require('events');
const utils = require('./utils');
const fixZero = utils.fixZero;
/**
 * LogStream
 * @param {Object} options
 * options {
 *   file: log_path, support variable : %year% , %month% , %day% , %hour% , %minute% , %pid%
 *   encoding : 'utf8'
 *   mode : 0666,
 *   cork: {Number} cork interval time
 *   remain: {Number}
 *   rotate: {Number}
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
    this.remain = options.remain || options.rotate;
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
  } else if (/%hour%/.test(str)) {
    return 2;
  } else if (/%day%/.test(str)) {
    return 3;
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
  let nameformat = this.nameformat;
  let sep = path.sep;
  let tmp = nameformat.split(sep);
  let flag = 0;
  tmp.forEach((v, i) => {
    if (/%\w+%/.test(v)) {
      flag = i;
    }
  });
  let base = tmp.slice(0, flag).join(sep);

  let file = this.calculateFileName(this.remain);
  let pattern = this.nameformat.substr(base.length)
    .replace(/%year%/g, '\\d{4}')
    .replace(/%month%/g, '\\d{2}')
    .replace(/%day%/g, '\\d{2}')
    .replace(/%hour%/g, '\\d{2}')
    .replace(/%minute%/g, '\\d{2}');


  if (file === this.filename) {
    return;
  }

  pattern = new RegExp(pattern);

  function cleanEmptyDir(base, fpath, callback) {
    function _c(p) {
      if (base === p) {
        return callback();
      }
      fs.rmdir(p, (err) => {
        if (err) {
          return callback(err);
        }
        p = path.dirname(p);
        _c(p);
      });
    }
    _c(fpath);
  }

  fs.walk(base, pattern, (err, f, done) => {
    if (file > f) {
      fs.unlink(f, (err) => {
        if (err && err.code !== 'ENOENT') {
          this.write('\n[litelog] rotate file error:' + err.message + '\n');
        }
        cleanEmptyDir(base, path.dirname(f), () => {
          done();
        });
      });
    } else {
      done();
    }
  }, () => {
    // do nothing
  });
  /* (err, list) => {
    if (err) {
      return this.write('\n[litelog] rotate file error:' + err.message + '\n');
    }
    let cursor = 0;
    function next() {
      let logfile = list[cursor];
      if (pattern.test(logfile) && fname >= logfile) {
        fs.unlink(path.join(dir, logfile), (err) => {
          if (err && err.code !== 'ENOENT') {
            this.write('\n[litelog] rotate file error:' + err.message + '\n');
          }
          cursor++;
          if (cursor < list.length) {
            process.nextTick(next);
          }
        });
      } else {
        cursor++;
        if (cursor < list.length) {
          process.nextTick(next);
        }
      }
    }
    next();
  });
  */
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
