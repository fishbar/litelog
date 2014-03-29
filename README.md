litelog
=======

lite nodejs log module

[![Build Status](https://travis-ci.org/fishbar/xfs.svg?branch=master)](https://travis-ci.org/fishbar/xfs)

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

  Log.get([name])         # get different log instance by name
  Log.debug(msg[,msg2])   # log debug level message
  Log.trace(msg[,msg2])   # log trace level message
  Log.info(msg[,msg2])    # log info level message
  Log.warn(msg[,msg2])    # log warm level message
  Log.error(msg[,msg2])   # log error level message
  Log.end()               # close this log stream

## License

  MIT
