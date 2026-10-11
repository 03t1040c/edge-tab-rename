const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../rules.js');
const rule = (word, url = '', enabled = true) => ({ word, url, enabled });
function apply(title, rules, url = 'https://example.com/sites/sales/page') {
  return api.transform(title, api.compile(api.activeRules({ enabled: true, rules }, url)));
}
test('literal deletion preserves punctuation, case and spaces', () => {
  assert.equal(apply('A [SPO]  B [SPO]', [rule('[SPO]')]).title, 'A   B ');
  assert.equal(apply('A.+ B', [rule('.+')]).title, 'A B');
  assert.equal(apply('abc ABC', [rule('ABC')]).title, 'abc ');
});
test('half/full-width and surrounding spaces are distinct', () => {
  assert.equal(apply('A B　C', [rule(' B')]).title, 'A　C');
  assert.equal(apply('A B　C', [rule('　')]).title, 'A BC');
  assert.equal(api.normalize({ rules: [rule(' ')] }).rules[0].word, ' ');
});
test('longest overlapping literal wins, deletion is one pass', () => {
  assert.equal(apply('foobar x', [rule('foo'), rule('foobar')]).title, ' x');
  assert.equal(apply('aabb', [rule('ab')]).title, 'ab');
});
test('empty title protection', () => {
  const result = apply('  SPO　', [rule('SPO')]);
  assert.equal(result.title, '  SPO　');
  assert.equal(result.emptyPrevented, true);
});
test('URL scopes enforce origin, path boundaries, query and hash', () => {
  const scope = 'https://example.com/sites/sales';
  assert.equal(api.matchesScope(scope, scope + '/page'), true);
  assert.equal(api.matchesScope(scope, scope + '2/page'), false);
  assert.equal(api.matchesScope('https://example.com', 'https://example.com.evil.org/'), false);
  assert.equal(api.matchesScope(scope, 'http://example.com/sites/sales'), false);
  assert.equal(api.matchesScope(scope, 'https://example.com:8443/sites/sales'), false);
  assert.equal(api.matchesScope(scope + '?a=1', scope + '?a=2'), false);
  assert.equal(api.matchesScope(scope + '#one', scope + '#two'), false);
  assert.equal(api.matchesScope('', 'https://anything.test/'), true);
  assert.equal(api.matchesScope('bad url', scope), false);
  assert.equal(api.validScope('javascript:alert(1)'), false);
});
test('global and individual pause', () => {
  assert.equal(apply('SPO Page', [rule('SPO', '', false)]).title, 'SPO Page');
  assert.equal(api.activeRules({ enabled: false, rules: [rule('SPO')] }, 'https://example.com').length, 0);
});
test('Unicode and metacharacters are literal, without regular-expression execution', () => {
  assert.equal(apply('😀 [.*] A', [rule('😀'), rule('[.*]')]).title, '  A');
});
