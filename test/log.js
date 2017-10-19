/*!
 * litelog: test/log.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
var Log = require('../');
var fs = require('xfs');
var expect = require('expect.js');
var path = require('path');

describe('test log', function () {
  var log = Log.create({
    sys : {
      level: 'DEBUG',
      file : './logs/abc.%year%-%month%.log',
      duration: 2
    },
    std : {
      level: 'DEBUG'
    },
    level : {
      level : 'INFO',
      file : './logs/abcd.%year%-%month%.log'
    },
    custom: {
      level: 'WARN',
      file: './logs/custom.log',
      formatter: function (msg) {
        msg.time = msg.time();
        return JSON.stringify(msg);
      }
    }
  });
  describe('create log object, test default first log', function () {
    it('check every level', function (done) {
      log.debug('debug');
      log.info('info');
      log.trace('trace');
      log.warn('warn');
      log.error('error');
      log.fatal('fatal');
      log.literal('literal');
      log.get('abc');
      var st = log.getStream();
      st.write('write from stream');
      setTimeout(function () {
        var dd = new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        m  = m > 9 ? m : '0' + m;
        var file =  './logs/abc.' + y + '-' + m + '.log';
        var err = fs.readFileSync(file, 'utf-8').toString();
        expect(err).to.be.match(/WARN/);
        expect(err).to.be.match(/ERROR/);
        expect(err).to.be.match(/DEBUG/);
        expect(err).to.be.match(/TRACE/);
        expect(err).to.be.match(/FATAL/);
        expect(err).to.be.match(/INFO/);
        expect(err).to.be.match(/write from stream/);
        //fs.unlinkSync(file);
        done();
      }, 100);
    });
    it('check every level', function (done) {
      var log2 = Log.create({
        sys : {
          level: 'DEBUG',
          file : './logs/abc.%year%-%month%.log'
        }
      });
      log2.debug('this is append info');
      var st = log.getStream();
      st.write('write from stream');
      setTimeout(function () {
        var dd = new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        m  = m > 9 ? m : '0' + m;
        var file =  './logs/abc.' + y + '-' + m + '.log';
        var err = fs.readFileSync(file, 'utf-8').toString();
        expect(err).to.be.match(/this is append info/);
        fs.unlinkSync(file);
        done();
      }, 100);
    });
    it('check custom formatter', function (done) {
      var ll = log.get('custom');
      var originFmt = ll.getFormatter();
      ll.setFormatter(function (obj) {
        obj.time = obj.time();
        return JSON.stringify(obj);
      });
      ll.warn('this is a %s', 'test');
      setTimeout(function () {
        var file = './logs/custom.log';
        var cnt = fs.readFileSync(file, 'utf-8').toString();
        fs.unlinkSync(file);
        var obj = JSON.parse(cnt);
        expect(obj).to.have.keys('time', 'level', 'pid', 'type', 'pos', 'msg');
        expect(obj.pos).to.match(/test\/log\.js:\d+/);
        expect(obj.msg).to.be('this is a test');
        expect(obj.level).match(/WARN/);
        expect(obj.pid).match(/^\d+$/);
        expect(obj.type).to.be('custom');
        expect(obj.time).to.match(/^\d{8}-\d{2}:\d{2}:\d{2}.\d{3}$/);
        ll.setFormatter(originFmt);
        done();
      });
    });
    it('check level setting', function (done) {
      var ll = log.get('level');
      ll.debug('debug');
      ll.info('info');
      ll.trace('trace');
      ll.warn('warn');
      ll.error('error');
      ll.fatal('fatal');
      setTimeout(function () {
        var dd = new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        m  = m > 9 ? m : '0' + m;
        var file = './logs/abcd.' + y + '-' + m + '.log';
        var err = fs.readFileSync(file, 'utf-8');
        expect(err).to.match(/WARN/);
        expect(err).to.match(/ERROR/);
        expect(err).to.not.match(/DEBUG/);
        expect(err).to.not.match(/TRACE/);
        expect(err).to.be.match(/FATAL/);
        expect(err).to.be.match(/INFO/);
        fs.unlinkSync(file);
        done();
      }, 100);
    });
    it('get with unknow name', function () {
      var ll = log.get('abc');
      expect(typeof ll.info).to.be('function');
    });
    it('check end log', function (done) {
      var ll = log.get('sys');
      ll.end(function () {
        expect(ll._stream.stream.closed).to.be(true);
        done();
      });
    });
    it('create by config file', function (done) {
      fs.writeFileSync('./logs/config.json', '{"fff":{"level":"ERROR","file":"./logs/fff.log"}}', 'utf-8');
      var llog = Log.create('./logs/config.json').get('fff');
      llog.error('abc');
      setTimeout(function () {
        var data = fs.readFileSync('./logs/fff.log');
        expect(data.toString()).to.match(/abc/);
        expect(data.toString()).to.match(/ERROR/);
        fs.unlinkSync('./logs/config.json');
        fs.unlinkSync('./logs/fff.log');
        done();
      }, 100);
    });

    it('check stdout', function () {
      var ll = log.get('std');
      ll.debug('this is show in std');
    });
    it('check stdout colorful', function () {
      var ll = log.get('std');
      ll.colorful(true);
      ll.debug('this is show in std, and should colorful');
      ll.colorful(false);
    });

    it('setRoot', function () {
      var ll = log.get('std');
      ll.setRoot(__dirname);
      ll.colorful(true);
      ll.debug('this is show in std, and should colorful');
      ll.colorful(false);
    });

    it('check custom fmt', function (done) {
      var file = path.join(__dirname, '../logs/test_fmt.log');
      var llog = Log.create({
        sys: {
          level: 'DEBUG',
          file: file,
          fmt: function (obj) {
            return obj.level + ' ' + obj.msg
          }
        }
      }).get('sys');

      llog.info('test');
      llog.end(function () {
        let res = fs.readFileSync(file).toString();
        expect(res).to.be('INFO test\n');
        fs.unlink(file, done);
      });

    });
  });

  describe('class LogStream', function () {
    var stream = log._stream;
    function fixZero(num) {
      return num > 9 ? num : '0' + num;
    }
    it('should get log filename fine with minute', function () {
      var originNameformat = this.nameformat;
      var remain = this.remain;
      var date = new Date();
      date.setMinutes(date.getMinutes() - 5);

      var result = date.getMinutes();
      stream.remain = 5;
      stream.nameformat = '/tmp/test/abc.%minute%.log';
      expect(stream.calculateFileName(5)).to.be('/tmp/test/abc.' + fixZero(result) + '.log');
    });
    it('should get log filename fine with hour', function () {
      var originNameformat = this.nameformat;
      var remain = this.remain;
      var date = new Date();
      date.setHours(date.getHours() - 5);

      var result = date.getHours();
      stream.remain = 5;
      stream.nameformat = '/tmp/test/abc.%hour%.log';
      expect(stream.calculateFileName(5)).to.be('/tmp/test/abc.' + fixZero(result) + '.log');
    });
    it('should get log filename fine with day', function () {
      var originNameformat = this.nameformat;
      var remain = this.remain;
      var date = new Date();
      date.setDate(date.getDate() - 5);

      var result = date.getDate();
      stream.remain = 5;
      stream.nameformat = '/tmp/test/abc.%day%.log';
      expect(stream.calculateFileName(5)).to.be('/tmp/test/abc.' + fixZero(result) + '.log');
    });
    it('should get log filename fine with month', function () {
      var originNameformat = this.nameformat;
      var remain = this.remain;
      var date = new Date();
      date.setMonth(date.getMonth() - 5);

      var result = date.getMonth() + 1;
      stream.remain = 5;
      stream.nameformat = '/tmp/test/abc.%month%.log';
      expect(stream.calculateFileName(5)).to.be('/tmp/test/abc.' + fixZero(result) + '.log');
    });
    it('should get log filename fine with month', function () {
      var originNameformat = this.nameformat;
      var remain = this.remain;
      var date = new Date();
      date.setFullYear(date.getFullYear() - 5);

      var result = date.getFullYear();
      stream.remain = 5;
      stream.nameformat = '/tmp/test/abc.%year%.log';
      expect(stream.calculateFileName(5)).to.be('/tmp/test/abc.' + result + '.log');
    });
  });
});
