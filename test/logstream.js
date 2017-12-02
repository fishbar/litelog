const expect = require('expect.js');
const fs = require('xfs');
const path = require('path');
const LogStream = require('../lib/logstream');

describe('logstream', () => {
  describe('normal log', () => {
    let logfile = path.join(__dirname, '../logs/normal.log')
    let options = {
      file: logfile,
      remain: 1
    };

    let stream;
    before(() => {
      if (fs.existsSync(logfile)) {
        fs.unlinkSync(logfile);
      }
      stream = new LogStream(options);
    })

    after(() => {
      fs.unlinkSync(logfile);
    })

    it('should work fine', (done) => {
      stream.write('abc');
      let cnt;
      cnt = fs.readFileSync(logfile).toString();
      expect(cnt).to.be('abc');
      stream.write('def');
      stream.end(()=> {
        cnt = fs.readFileSync(logfile).toString();
        expect(cnt).to.be('abcdef');
        done();
      });
    });
  });

  describe('cork option', () => {
    let logfile = path.join(__dirname, '../logs/cork.log')
    let options = {
      file: logfile,
      cork: 100,
      remain: 1
    };

    let stream;
    beforeEach(() => {
      if (stream) {
        stream.end();
      }
      if (fs.existsSync(logfile)) {
        fs.unlinkSync(logfile);
      }
      stream = new LogStream(options);
    })

    after(() => {
      fs.unlinkSync(logfile);
    })

    it('should cork write', (done) => {
      stream.write('abc');
      setTimeout( () => {
        let cnt = fs.readFileSync(logfile).toString();
        expect(cnt).to.be('');
        setTimeout(() => {
          let cnt = fs.readFileSync(logfile).toString();
          expect(cnt).to.be('abc');
          done();
        }, 110);
      }, 90);
    });
  });
  describe('rotate', () => {
    let options = {
      file: path.join(__dirname, '../logs/logstream/%year%/a.log'),
      remain: 1
    };
    let year = new Date().getFullYear();
    let stream = new LogStream(options);

    function logFile(n) {
      return path.join(__dirname, '../logs/logstream/' + n + '/a.log')
    }
    before(() => {
      fs.sync().save(logFile(year - 3), 'abc');
      fs.sync().save(logFile(year - 2), 'abc');
      fs.sync().save(logFile(year - 1), 'abc');
      fs.sync().save(logFile(year + 1), 'abc');
      fs.sync().save(logFile(year + '+'), 'abc');
    });

    after(() => {
      fs.unlinkSync(logFile(year + '+'), 'abc');
    });

    it('should clean old logs fine', (done) => {
      stream.rotate();
      setTimeout(() => {
        expect(fs.existsSync(logFile(year - 3))).to.be(false);
        expect(fs.existsSync(logFile(year - 2))).to.be(false);
        expect(fs.existsSync(logFile(year - 1))).to.be(true);
        expect(fs.existsSync(logFile(year))).to.be(true);
        expect(fs.existsSync(logFile(year + 1))).to.be(true);
        expect(fs.existsSync(logFile(year + '+'))).to.be(true);
        done();
      }, 200);
    });
  });

});