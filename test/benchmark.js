/*!
 * litelog: test/benchmark.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2014-03-29 16:52:44
 * CopyRight 2014 (c) Fish And Other Contributors
 */
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;


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
    (m > 9 ? m : ('0' + m)) + '-' + 
    (d > 9 ? d : ('0' + d)) + ' ' +
    (H > 9 ? H : ('0' + H)) + ':' +
    (i > 9 ? i : ('0' + i)) + ':' +
    (s > 9 ? s : ('0' + s )) + '.' +
    (ms > 99 ? ms : (ms > 9 ? '0' + ms : ('00' + ms)));
}

function getTime2() {
  var dd = new Date();
  return dd.toISOString();
}

function getTime3() {
  var t = new Date();
  var Y = t.getFullYear();
  var m = t.getMonth() + 1;
  var d = t.getDate();
  var H = t.getHours();
  var i = t.getMinutes();
  var s = t.getSeconds() + t.getMilliseconds() / 1000;

  
  var obj = {
    Y: Y,
    m: m > 9 ? m : ('0' + m),
    d: d > 9 ? d : ('0' + d),
    H: H > 9 ? H : ('0' + H),
    i: i > 9 ? i : ('0' + i),
    s: s >= 10 ? s : ('0' + s)
  };

  var fmt = 'Y-m-d H:i:s';

  return fmt.replace(/\w/g, function (m) {
    return obj[m];
  });
}

function getTime4() {
  var t = new Date();
  var Y = t.getFullYear();
  var m = t.getMonth() + 1;
  var d = t.getDate();
  var H = t.getHours();
  var i = t.getMinutes();
  var s = t.getSeconds();
  var ms = t.getMilliseconds();
  ms = ms > 99 ? ms : ms > 9 ? '0' + ms : '00' + ms;

  return [Y, '-',
    (m > 9 ? m : ('0' + m)), '-', 
    (d > 9 ? d : ('0' + d)), ' ',
    (H > 9 ? H : ('0' + H)), ':',
    (i > 9 ? i : ('0' + i)), ':',
    (s > 9 ? s : ('0' + s)), '.', ms].join('');
}
/** fastest **/
function getTime5(){
  var t = new Date();
  var Y = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  var H = t.getHours();
  var i = t.getMinutes();
  var s = t.getSeconds();
  var ms = t.getMilliseconds();

  return Y + ' ' + 
    (H > 9 ? H : ('0' + H)) + ':' +
    (i > 9 ? i : ('0' + i)) + ':' +
    (s > 9 ? s : ('0' + s )) + '.' + 
    (ms > 99 ? ms : (ms > 9 ? '0' + ms : ('00' + ms)));
}

// console.log([getTime(),getTime2(),getTime3(),getTime4(),getTime5()]);
// add tests
suite.add('getTime()', function() {
  getTime();
})
/*
.add('getTime2()', function() {
  getTime2();
})
.add('getTime3()', function () {
  getTime3();
})
.add('getTime4()', function () {
  getTime4();
})
*/
.add('getTime5()', function () {
  getTime5();
})
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async
.run({ 'async': true });