'use strict';

function fixZero(num) {
  return num > 9 ? num : '0' + num;
}

exports.fixZero = fixZero;

exports.getTime = (date, fmt) => {
  var t = d || new Date();
  var Y = t.getFullYear();
  var m = fixZero(t.getMonth() + 1);
  var d = fixZero(t.getDate());
  var H = t.getHours();
  var M = t.getMinutes();
  var S = t.getSeconds();
  var s = t.getMilliseconds();

  if (fmt) {
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
      (H > 9 ? H : ('0' + H)) + ':' +
      (M > 9 ? M : ('0' + M)) + ':' +
      (S > 9 ? S : ('0' + S)) + '.' +
      (s > 99 ? s : (s > 9 ? '0' + s : ('00' + s)));
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