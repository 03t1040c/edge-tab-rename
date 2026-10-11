const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const fixture = '<!doctype html><html><head><meta charset="utf-8"><title>Long Site - Page One</title></head><body><h1>Test page</h1></body></html>';
const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fixture); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name); }
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = `http://127.0.0.1:${server.address().port}`;
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, 'edge-profile-')), {
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, '--no-first-run'],
    viewport: { width: 1240, height: 1000 }
  });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    const extensionId = new URL(worker.url()).hostname;
    console.log('Real Edge extension loaded: ' + extensionId);
    const settings = { enabled: true, rules: [{ id: 'one', word: 'Long Site - ', url: '', enabled: true }] };
    await worker.evaluate(value => chrome.storage.local.set({ settings: value }), settings);
    const page = await context.newPage();
    await page.goto(address + '/sales/one');
    async function titleIs(expected) {
      await page.waitForFunction(value => document.title === value, expected, { timeout: 5000 });
      assert.equal(await page.title(), expected);
    }
    await check('initial title deletion', () => titleIs('Page One'));
    await check('page title rewrite remains shortened', async () => {
      await page.evaluate(() => { document.title = 'Long Site - Page Two'; });
      await titleIs('Page Two');
    });
    await check('title element replacement', async () => {
      await page.evaluate(() => {
        const next = document.createElement('title'); next.textContent = 'Long Site - Replaced';
        document.querySelector('title').replaceWith(next);
      });
      await titleIs('Replaced');
    });
    await check('title character data update', async () => {
      await page.evaluate(() => { document.querySelector('title').firstChild.data = 'Long Site - Text Node'; });
      await titleIs('Text Node');
    });
    await check('setting change restores original then reapplies', async () => {
      await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: false, rules: [{ id: 'one', word: 'Long Site - ', url: '', enabled: true }] } }));
      await titleIs('Long Site - Text Node');
      await worker.evaluate(value => chrome.storage.local.set({ settings: value }), settings);
      await titleIs('Text Node');
    });
    await check('single-pass removal does not recursively delete', async () => {
      await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: true, rules: [{ id: 'ab', word: 'ab', url: '', enabled: true }] } }));
      await page.evaluate(() => { document.title = 'aabb'; });
      await titleIs('ab');
      await delay(250);
      assert.equal(await page.title(), 'ab');
    });
    await check('SPA URL changes with unchanged title re-evaluate scopes', async () => {
      await page.evaluate(() => { document.title = 'Long Site - Scoped'; });
      await worker.evaluate(value => chrome.storage.local.set({ settings: value }), {
        enabled: true, rules: [{ id: 'scoped', word: 'Long Site - ', url: address + '/sales', enabled: true }]
      });
      await titleIs('Scoped');
      await page.evaluate(() => history.pushState({}, '', '/other'));
      await titleIs('Long Site - Scoped');
      await page.evaluate(() => history.pushState({}, '', '/sales/again'));
      await titleIs('Scoped');
    });
    await check('external title equal to rendered title becomes the new original', async () => {
      await page.evaluate(() => { document.title = 'Scoped'; });
      await delay(100);
      await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: true, rules: [] } }));
      await titleIs('Scoped');
      await worker.evaluate(value => chrome.storage.local.set({ settings: value }), settings);
    });
    await check('head replacement', async () => {
      await page.evaluate(() => {
        const head = document.createElement('head');
        const title = document.createElement('title'); title.textContent = 'Long Site - New Head';
        head.append(title); document.head.replaceWith(head);
      });
      await titleIs('New Head');
    });
    await check('deleting all rules restores original', async () => {
      await worker.evaluate(() => chrome.storage.local.set({ settings: { enabled: true, rules: [] } }));
      await titleIs('Long Site - New Head');
      await page.evaluate(() => { document.title = 'Unobserved'; });
      await delay(100);
      assert.equal(await page.title(), 'Unobserved');
    });
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await check('settings add word with no URL configuration', async () => {
      await options.locator('#word').fill('Long Site - ');
      await options.locator('#sample-title').fill('Long Site - Page　One');
      await options.locator('#add-rule').click();
      await options.locator('.rule').waitFor();
      assert.equal(await options.locator('.rule').count(), 1);
      assert.equal(await options.locator('#after').textContent(), 'Page全角SPOne');
    });
    await check('space markers and literal words are safe', async () => {
      await options.locator('#word').fill('<img src=x onerror=alert(1)> ');
      await options.locator('#sample-title').fill('<img src=x onerror=alert(1)> Page');
      assert.equal(await options.locator('#after').textContent(), 'Page');
      assert.equal(await options.locator('#before img').count(), 0);
      await options.locator('#word').fill('');
    });
    await check('preview retrieves the original tab title', async () => {
      await page.evaluate(() => { document.title = 'Long Site - Preview'; });
      await titleIs('Preview');
      await options.locator('#refresh-tabs').click();
      const tabId = await worker.evaluate(async prefix => (await chrome.tabs.query({})).find(tab => tab.url?.startsWith(prefix)).id, address);
      await options.locator('#tab-select').selectOption(String(tabId));
      await options.waitForFunction(() => document.getElementById('sample-title').value === 'Long Site - Preview');
    });
    await check('settings survive reload', async () => {
      await options.reload();
      await options.locator('.rule').waitFor();
      assert.equal(await options.locator('.rule-word').textContent(), 'Long半角SPSite半角SP-半角SP');
    });
    await check('selecting sample text preserves actual spaces in the word field', async () => {
      await options.locator('#sample-title').fill('A　B Page');
      await options.locator('#sample-title').evaluate(node => { node.focus(); node.setSelectionRange(0, 3); node.dispatchEvent(new Event('select')); });
      await options.locator('#selection-word').click();
      assert.equal(await options.locator('#word').inputValue(), 'A　B');
      await options.locator('#word').fill('');
    });
    await check('repeated page rewrites converge to the latest shortened title', async () => {
      await page.evaluate(() => new Promise(resolve => {
        let n = 0;
        const timer = setInterval(() => {
          document.title = 'Long Site - Burst ' + (++n);
          if (n === 80) { clearInterval(timer); resolve(); }
        }, 2);
      }));
      await titleIs('Burst 80');
    });
    await check('URL-limited rule edit and removal', async () => {
      await options.locator('.rule-actions button').first().click();
      await options.locator('#scope-details').evaluate(node => { node.open = true; });
      await options.locator('#scope').fill(address + '/other');
      await options.locator('#add-rule').click();
      await titleIs('Long Site - Burst 80');
      await options.locator('.rule-actions button').last().click();
      await options.locator('#empty').waitFor({ state: 'visible' });
      await options.locator('#word').fill('Long Site - ');
      await options.locator('#add-rule').click();
      await titleIs('Burst 80');
    });
    await check('editing a paused rule preserves its paused state', async () => {
      await options.locator('.rule input').uncheck();
      await titleIs('Long Site - Burst 80');
      await options.locator('.rule-actions button').first().click();
      await options.locator('#add-rule').click();
      assert.equal(await options.locator('.rule input').isChecked(), false);
      assert.equal(await page.title(), 'Long Site - Burst 80');
      await options.locator('.rule input').check();
      await titleIs('Burst 80');
    });
    await check('global pause from settings restores and reapplies titles', async () => {
      await options.locator('#enabled').uncheck();
      await titleIs('Long Site - Burst 80');
      await options.locator('#enabled').check();
      await titleIs('Burst 80');
    });
    const performanceTabs = [page];
    for (let i = 0; i < 11; i++) {
      const extra = await context.newPage();
      await extra.goto(address + '/idle/' + i);
      await extra.waitForFunction(() => document.title === 'Page One');
      performanceTabs.push(extra);
    }
    const sessions = await Promise.all(performanceTabs.map(tab => context.newCDPSession(tab)));
    for (const session of sessions) await session.send('Performance.enable');
    const taskTimes = async () => Promise.all(sessions.map(async session => {
      const report = await session.send('Performance.getMetrics');
      return report.metrics.find(item => item.name === 'TaskDuration').value;
    }));
    await delay(200);
    const idleStart = await taskTimes();
    await delay(1500);
    const idleEnd = await taskTimes();
    const idleTaskMs = idleEnd.reduce((sum, value, i) => sum + (value - idleStart[i]) * 1000, 0);
    console.log(`Idle observation: ${performanceTabs.length} tabs, 1500ms, total renderer task time ${idleTaskMs.toFixed(2)}ms`);
    await options.locator('#sample-title').fill('Long Site - 月次報告');
    await options.screenshot({ path: path.join(output, 'settings-desktop.png'), fullPage: true });
    await options.setViewportSize({ width: 440, height: 1000 });
    await options.screenshot({ path: path.join(output, 'settings-mobile.png'), fullPage: true });
    await options.emulateMedia({ colorScheme: 'dark' });
    await options.setViewportSize({ width: 1240, height: 1000 });
    await options.screenshot({ path: path.join(output, 'settings-dark.png'), fullPage: true });
    // Store screenshots are actual extension pages at 80% browser zoom, with fictional data.
    const storeAssets = path.join(root, 'store-assets');
    fs.mkdirSync(storeAssets, { recursive: true });
    await worker.evaluate(() => chrome.storage.local.set({ settings: {
      enabled: true, rules: [{ id: 'store-example', word: '株式会社サンプル 情報共有ポータル - ', url: '', enabled: true }]
    } }));
    await options.reload();
    await options.locator('.rule').waitFor();
    await options.setViewportSize({ width: 1280, height: 800 });
    await options.emulateMedia({ colorScheme: 'light' });
    await options.evaluate(async () => {
      const tab = await chrome.tabs.getCurrent();
      await chrome.tabs.setZoom(tab.id, 0.8);
    });
    await options.locator('#sample-title').fill('株式会社サンプル 情報共有ポータル - 月次報告');
    await options.locator('#show-spaces').uncheck();
    await options.locator('#sample-title').blur();
    await options.screenshot({ path: path.join(storeAssets, 'screenshot-words-1280x800.png') });
    await options.locator('#show-spaces').check();
    await options.locator('#show-spaces').blur();
    await options.screenshot({ path: path.join(storeAssets, 'screenshot-spaces-1280x800.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ browser: await context.browser()?.version(), checks, pageErrors: errors,
      idleObservation: { tabs: performanceTabs.length, durationMs: 1500, totalRendererTaskMs: idleTaskMs }
    }, null, 2));
    console.log(`${checks.length} Edge browser checks passed.`);
  } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
