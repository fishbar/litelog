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
    file: Log.STDOUT
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
    file: './logs/moduleA.%year%.%month%.%day%.%hour%.%pid%'
  },
  custom: {
    level: 'DEBUG',
    file: './logs/custom.log',
    formatter: function (msg) {
      /**
       * custom the log format
       * object msg {
       *  level {String}   DEBUG|WARN|ERROR...
       *  type  {String}   the log name, here is `custom`
       *  pid   {Number}   the log is write by which process
       *  pos   {String}   the log is written by which code
       *  msg   {String}   the log msg
       *  time {Function} return current time string,custom timeformat if you needed
       * }
       */
    }
  }
};
var log = Log.create(logConfig);
// default log is the first log in the config object
// write log sys
log.info('i am the default log object');
// write log moduleA
log.get('moduleA').warn('warn moduleA');

(log.get() === log) && console.log('they are same log object');
```

## Class Log

* Log.get([name])         # get different log instance by name
* Log.debug(msg[,msg2])   # log debug level message
* Log.trace(msg[,msg2])   # log trace level message
* Log.info(msg[,msg2])    # log info level message
* Log.warn(msg[,msg2])    # log warm level message
* Log.error(msg[,msg2])   # log error level message
* Log.end()               # close this log stream

## License

  MIT
