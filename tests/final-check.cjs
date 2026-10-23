const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><meta charset="utf-8"><title>Long Site - Final</title></head><body>Final checks</body></html>');
});
async function check(name, action) {
  if (process.env.FINAL_CHECK_FILTER && !name.includes(process.env.FINAL_CHECK_FILTER)) return;
  try { await action(); results.push({ name, passed: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = `http://127.0.0.1:${server.address().port}/page`;
  const profile = fs.mkdtempSync(path.join(output, 'final-edge-'));
  const launch = () => chromium.launchPersistentContext(profile, {
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true, ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, '--no-first-run']
  });
  let context = await launch();
  let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).hostname;
  const rule = { id: 'original', word: 'Long Site - ', url: '', enabled: true };
  const configure = rules => worker.evaluate(value => chrome.storage.local.set({ settings: { enabled: true, rules: value } }), rules);
  let page = await context.newPage();
  await page.goto(address);
  const titleIs = expected => page.waitForFunction(value => document.title === value, expected, { timeout: 3000 });
  try {
    await check('settings mutation is blocked until saved rules have loaded', async () => {
      await configure([rule]);
      const options = await context.newPage();
      await options.addInitScript(() => {
        const original = chrome.storage.local.get.bind(chrome.storage.local);
        chrome.storage.local.get = async (...args) => {
          const result = await original(...args);
          await new Promise(resolve => setTimeout(resolve, 700));
          return result;
        };
      });
      await options.goto(`chrome-extension://${id}/options.html`);
      const protectedAtStart = await options.locator('#add-rule').isDisabled();
      await options.locator('#word').fill('Another');
      await options.locator('#add-rule').click();
      await delay(800);
      const saved = await worker.evaluate(() => chrome.storage.local.get('settings'));
      assert.ok(saved.settings.rules.some(item => item.id === 'original'), 'existing rules were lost during initial load');
      assert.equal(protectedAtStart, true, 'save button is enabled before storage read completes');
      await options.close();
    });
    await configure([rule]);
    await check('manual preview input is not overwritten by a delayed tab response', async () => {
      const options = await context.newPage();
      await options.goto(`chrome-extension://${id}/options.html`);
      await options.locator('.rule').waitFor();
      await options.locator('#tab-select option').nth(1).waitFor({ state: 'attached' });
      await options.evaluate(() => {
        const original = chrome.tabs.sendMessage.bind(chrome.tabs);
        chrome.tabs.sendMessage = async (...args) => {
          const result = await original(...args);
          await new Promise(resolve => setTimeout(resolve, 500));
          return result;
        };
      });
      const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, address);
      await options.locator('#tab-select').selectOption(String(tabId));
      await options.locator('#sample-title').fill('My manual preview');
      await delay(650);
      assert.equal(await options.locator('#sample-title').inputValue(), 'My manual preview');
      await options.close();
    });
    await configure([rule]);
    await check('a rule deleted in another window is not silently saved as a lost edit', async () => {
      const options = await context.newPage();
      await options.goto(`chrome-extension://${id}/options.html`);
      await options.locator('.rule-actions button').first().click();
      await configure([]);
      await options.locator('#empty').waitFor({ state: 'visible' });
      await options.locator('#word').fill('Replacement');
      await options.locator('#add-rule').click();
      await delay(100);
      const saved = await worker.evaluate(() => chrome.storage.local.get('settings'));
      const persisted = saved.settings.rules.some(item => item.word === 'Replacement');
      const visibleError = await options.locator('#status').evaluate(node => node.classList.contains('error'));
      assert.ok(persisted || visibleError, 'UI reports saved but the edited word is missing');
      await options.close();
    });
    await check('character limits also apply when copying text from preview', async () => {
      await configure([rule]);
      const options = await context.newPage();
      await options.goto(`chrome-extension://${id}/options.html`);
      await options.locator('.rule').waitFor();
      await options.locator('#sample-title').fill('a'.repeat(2050));
      await options.locator('#sample-title').evaluate(node => { node.focus(); node.select(); node.dispatchEvent(new Event('select')); });
      await options.locator('#selection-word').click();
      await options.locator('#add-rule').click();
      await delay(100);
      const saved = await worker.evaluate(() => chrome.storage.local.get('settings'));
      assert.ok(saved.settings.rules.every(item => item.word.length <= 2048), 'overlong copied rule was saved');
      await options.close();
    });
    await configure([rule]);
    await titleIs('Final');
    await check('reinjecting content scripts does not lose the original title', async () => {
      const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, address);
      await worker.evaluate(id => chrome.scripting.executeScript({ target: { tabId: id }, files: ['rules.js', 'content.js'] }), tabId);
      await configure([]);
      await titleIs('Long Site - Final');
      await configure([rule]);
      await titleIs('Final');
    });
    await check('reinjection respects a pending external title equal to the last shortened output', async () => {
      await configure([{ id: 'ab', word: 'ab', url: '', enabled: true }]);
      await page.evaluate(() => { document.title = 'aabb'; });
      await titleIs('ab');
      await page.evaluate(() => { document.title = 'ab'; });
      const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, address);
      await worker.evaluate(id => chrome.scripting.executeScript({ target: { tabId: id }, files: ['rules.js', 'content.js'] }), tabId);
      await configure([]);
      await titleIs('ab');
      await page.evaluate(() => { document.title = 'Long Site - Final'; });
      await configure([rule]);
      await titleIs('Final');
    });
    await check('extension reload keeps existing tabs working', async () => {
      const nextWorker = context.waitForEvent('serviceworker', { timeout: 10000 });
      await worker.evaluate(() => chrome.runtime.reload()).catch(() => {});
      worker = await nextWorker;
      await delay(300);
      await page.evaluate(() => { document.title = 'Long Site - After Reload'; });
      await titleIs('After Reload');
      await configure([]);
      await titleIs('Long Site - After Reload');
      await configure([rule]);
    });
    await check('browser restart preserves settings and reapplies on a new page', async () => {
      await configure([rule]);
      await context.close();
      context = await launch();
      worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      const saved = await worker.evaluate(() => chrome.storage.local.get('settings'));
      assert.equal(saved.settings.rules[0].word, rule.word);
      page = await context.newPage();
      await page.goto(address);
      await titleIs('Final');
    });
  } finally {
    await context.close();
    fs.writeFileSync(path.join(output, 'final-check-report.json'), JSON.stringify(results, null, 2));
  }
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
