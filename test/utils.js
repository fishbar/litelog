'use strict';
const expect = require('expect.js');
const testMod = require('../lib/utils');

describe('utils.js', () => {
  it('fixZero() fine', () => {
      expect(testMod.fixZero(9)).to.eql('09');
      expect(testMod.fixZero(10)).to.eql('10');
      expect(testMod.fixZero(0)).to.eql('00');
  });

  it('getTime() fine', () => {
    expect(testMod.getTime()).to.match(/\d{8}-\d{2}:\d{2}:\d{2}.\d{3}/);
  });
});