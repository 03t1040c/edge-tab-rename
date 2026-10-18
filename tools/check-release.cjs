// Check loader dependencies and store assets before packaging; uses only Node built-ins.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.default_locale, 'ja');
const localePath = `_locales/${manifest.default_locale}/messages.json`;
const messages = JSON.parse(read(localePath));
for (const [, key] of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) {
  assert.ok(messages[key]?.message, `Unresolved manifest message: ${key}`);
}
const references = [manifest.background.service_worker, manifest.options_ui.page, localePath,
  ...manifest.content_scripts.flatMap(script => script.js || []),
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  'options.js', 'options.css', 'privacy.html'];
for (const name of references) assert.ok(fs.existsSync(path.join(root, name)), `Missing resource: ${name}`);
const pngSize = name => {
  const data = fs.readFileSync(path.join(root, name));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Not a PNG: ${name}`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};
assert.deepEqual(pngSize('store-assets/logo-300.png'), [300, 300]);
for (const name of ['words', 'spaces']) {
  assert.deepEqual(pngSize(`store-assets/screenshot-${name}-1280x800.png`), [1280, 800]);
}
const description = read('store-assets/description-ja.txt').trim();
assert.ok(description.length >= 250 && description.length <= 10000);
const policy = read('privacy.html');
const publicPolicy = read('docs/privacy.html');
assert.equal(publicPolicy, read('store-assets/privacy.html'));
assert.equal(policy.slice(policy.indexOf('<body>')), publicPolicy.slice(publicPolicy.indexOf('<body>')));
assert.ok(!publicPolicy.includes('<link rel="stylesheet"'), 'Public policy must be self-contained');
console.log(`Release ${manifest.version}: locale, loader resources, PNG dimensions and privacy copies verified.`);
