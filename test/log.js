var jsc = require('jscoverage');
require = jsc.mock(module);
var Log = require('../log', true);
Log.base(__dirname);
var fs = require('fs');
var expect = require('expect.js');

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
    }
  });
  describe('create log object, test default first log', function () {
    it('check every level', function (done) {
      log.debug('debug');
      log.info('info');
      log.trace('trace');
      log.warn('warn');
      log.error('error');
      log.fatal("fatal");
      log.literal('literal');
      var st = log.getStream();
      st.write('write from stream');
      setTimeout(function () {
        var dd = new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        m  = m > 9 ? m : '0' + m;
        var file = __dirname + '/logs/abc.' + y + '-' + m + '.log';
        var err = fs.readFileSync(file, 'utf-8');
        expect(err).to.be.match(/WARN/);
        expect(err).to.be.match(/ERROR/);
        expect(err).to.be.match(/DEBUG/);
        expect(err).to.be.match(/TRACE/);
        expect(err).to.be.match(/FATAL/);
        expect(err).to.be.match(/INFO/);
        expect(err).to.be.match(/write from stream/);
        fs.unlinkSync(file);
        done();
      }, 10);
    });
    it('check level setting', function (done) {
      var ll = log.get('level');
      ll.debug('debug');
      ll.info('info');
      ll.trace('trace');
      ll.warn('warn');
      ll.error('error');
      ll.fatal("fatal");
      setTimeout(function () {
        var dd = new Date();
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1;
        m  = m > 9 ? m : '0' + m;
        var file = __dirname + '/logs/abcd.' + y + '-' + m + '.log';
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
    it('check get log', function () {
      function a() {
        log.get('abc');
      }
      expect(a).to.throwException();
    });
    it('check end log', function () {
      var ll = log.get('sys');
      ll.end();
      expect(ll._stream.stream.writable).to.be(false);
    });
    it('check config file', function (done) {
      fs.writeFileSync(__dirname + '/logs/config.json', '{"sys":{"level":"ERROR","file":"./logs/abc.log"}}', 'utf-8');
      var llog = Log.create(__dirname + '/logs/config.json');
      llog.error('abc');
      setTimeout(function () {
        var data = fs.readFileSync(__dirname + '/logs/abc.log');
        expect(data.toString()).to.match(/abc/);
        expect(data.toString()).to.match(/ERROR/);
        fs.unlinkSync(__dirname + '/logs/config.json');
        fs.unlinkSync(__dirname + '/logs/abc.log');
        done();
      }, 50);
    });

    it('check stdout', function () {
      var ll = log.get('std');
      ll.debug('');
    });
  });
});
