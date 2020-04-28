'use strict';

function fixZero(num) {
  return num > 9 ? num : '0' + num;
}

function fixZero2(s) {
  return s > 99 ? s : (s > 9 ? '0' + s : ('00' + s));
}

exports.fixZero = fixZero;

exports.getTime = (date, fmt) => {
  var t = date || new Date();
  var H = fixZero(t.getHours());
  var M = fixZero(t.getMinutes());
  var S = fixZero(t.getSeconds());
  var s = fixZero2(t.getMilliseconds());
  if (fmt) {
    var Y = t.getFullYear();
    var m = fixZero(t.getMonth() + 1);
    var d = fixZero(t.getDate());
    var obj = {
      Y: Y,
      m: m,
      d: d,
      H: H,
      M: M,
      S: S,
      s: s
    };
    return fmt.replace(/%(\w)/g, (m0, m1) => {
      return obj[m1];
    });
  } else {
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate() + '-' +
      H + ':' + M + ':' + S + '.' + s;
  }
};

const head = '\x1B[';
const foot = '\x1B[0m';
const colors = {
  DEBUG: 36,
  TRACE: 32,
  INFO: 34,
  WARN: 33,
  ERROR: 31,
  FATAL: 35,
  BLACK: 30,
  RED: 31,
  GREEN: 32,
  YELLOW: 33,
  BLUE: 34,
  WHITE: 37,
};
function color(type, info) {
  var cc = colors[type] + 'm';
  return head + cc + info + foot;
}
exports.color = color;