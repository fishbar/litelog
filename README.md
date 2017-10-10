litelog
=======

A nodejs log module

[![Build Status](https://travis-ci.org/fishbar/litelog.svg?branch=master)](https://travis-ci.org/fishbar/litelog)

* display with colorful label
* support mulit-category log files
* 6 loglevel, you can easily control output message
* split log by %year% %month% %day% %hour% %pid%

## useage

```shell
npm install litelog
```

创建一个log对象，一个log日志输出，分组为sys, 输出到process.stdout
```js
var Log = require('litelog');
var logConfig = {
  sys: {
    level: 'DEBUG', // level can be DEBUG|TRACE|INFO|WARN|ERROR|FATAL
    file: Log.STDOUT, // abs file path or  STDOUT
    cork: 500 // cork interval, unit ms, by default, stream is uncork, this will optmize fs.write performance
    rotation: 60 // set up log file auto rotation, this number means max log files will be keeped, then other will be auto deleted
  }
};
var log = Log.create(logConfig);
// like console.log, Log API can pass more then one param
// output
// [20140303 12:00:00] [INFO] sys file.js:10 1 2 3 4
// time                level  cate file:line  messages
log.info(1, 2, 3, 4);
```

创建一个log对象，多个日志输出，这样可以给不同的模块分配不同的日志文件
```js
var Log = require('litelog');
var logConfig = {
  sys: {
    level: 'DEBUG', // level can be DEBUG|TRACE|INFO|WARN|ERROR|FATAL
    file: Log.STDOUT
  },
  moduleA: {
    level: 'WARN',
    // split your log file, all support vars are list in this example
    file: './logs/moduleA.%year%.%month%.%day%.%hour%.%pid%',
  },
  custom: {
    level: 'DEBUG',
    file: './logs/custom.log',
    /**
     * custom log formatter
     */
    fmt: function(obj) {
      /**
       * message obj:
       *   level {String} message level
       *   pid {String} pid,
       *   type {String} type,
       *   pos {String} pos,
       *   msg {String} msg,
       *   color(level, msg) {Function} print msg colorfully  
       *   time(d) {Function} getTime, if d is undefined, d = now()
       */
       return return obj.color(obj.level, obj.time() + ' ' + obj.level) + ' #' + obj.pid + ' ' + obj.type + ' (' + obj.pos + ') ' + obj.msg;
    }
  }
};
var log = Log.create(logConfig);
// default log is the first log in the config object
// write log sys
log.info('i am the default log object');
// write log moduleA
log.get('moduleA').warn('warn moduleA');
// setRoot for cut short the log call referer script path,
log.setRoot(root);

(log.get() === log) && console.log('they are same log object');
```

## <class> Log

### instance functions

* Log.get([name])         # get different log instance by name
* Log.debug(msg[,msg2])   # log debug level message
* Log.trace(msg[,msg2])   # log trace level message
* Log.info(msg[,msg2])    # log info level message
* Log.warn(msg[,msg2])    # log warm level message
* Log.error(msg[,msg2])   # log error level message
* Log.end()               # close this log stream
* Log.colorful(boolean)   # enable colorful print, default is false
* Log.time()              # get sys time  yyyy-mm-dd hh:mm:ss.ms
* Log.setFormatter        # set formatter function
## License

  MIT
