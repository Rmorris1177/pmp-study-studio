// Run after installing Playwright: node tests/browser-smoke.cjs
// Serves the development build locally; does not publish or modify the live site.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(url);
    await page.locator('#card').waitFor();
    fs.mkdirSync(path.join(root, 'test-artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-artifacts', 'desktop-study.png'), fullPage: true });
    assert.match(await page.locator('#card').innerText(), /Essential notes/i);
    // Installing must not navigate away from the current study screen.
    await page.locator('#install-app').click();
    assert.match(await page.locator('#card').innerText(), /Essential notes/i);
    await page.getByRole('button', { name: 'Start practice' }).click();
    await page.locator('.options input').first().check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    assert.match(await page.locator('#card').innerText(), /Correct|Incorrect/);
    await page.reload();
    assert.match(await page.locator('#card').innerText(), /Welcome back/);
    await page.getByRole('button', { name: 'Resume studying' }).click();
    assert.match(await page.locator('#card').innerText(), /Correct|Incorrect/);
    await page.locator('#outline').click();
    await page.getByRole('button', { name: 'Open exam simulator' }).click();
    await page.getByRole('button', { name: 'Start 30 questions' }).click();
    assert.match(await page.locator('#card').innerText(), /Question 1 of 30/);
    await page.locator('.exam-choice input').first().check();
    await page.getByRole('button', { name: 'Save answer and next' }).click();
    assert.match(await page.locator('#card').innerText(), /Question 2 of 30/);
    await page.reload();
    await page.getByRole('button', { name: 'Resume studying' }).click();
    assert.match(await page.locator('#card').innerText(), /Question 2 of 30/);
    // Finish the resumed exam and verify scoring and answer review.
    await page.getByRole('button', { name: 'Finish early' }).click();
    assert.match(await page.locator('#card').innerText(), /Practice exam results/);
    await page.getByText('Review all answers and explanations').click();
    assert.match(await page.locator('#card').innerText(), /Correct answer:/);
    await page.getByRole('button', { name: 'Start another exam' }).click();
    await page.getByRole('button', { name: 'Timed · 30 questions' }).click();
    assert.match(await page.locator('#card').innerText(), /Time remaining:/);
    const timed = await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          if (value && value.exam && value.exam.durationMs) return { key, value };
        } catch {}
      }
      return null;
    });
    assert.ok(timed, 'Timed exam must be saved in localStorage');
    assert.equal(timed.value.exam.durationMs, 6900000, '30-question exam should allow 115 minutes');
    // Change the active app state, not only localStorage: the app persists its
    // in-memory state on pagehide, which would overwrite a storage-only edit.
    await page.evaluate(() => {
      state.exam.startedAt = Date.now() - state.exam.durationMs - 1000;
      save();
    });
    const persisted = await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key));
      return { startedAt: value.exam.startedAt, durationMs: value.exam.durationMs, view: value.view, lastStudy: value.lastStudy };
    }, timed.key);
    assert.ok(Date.now() - persisted.startedAt > persisted.durationMs, 'Expired exam timestamp must be persisted');
    await page.reload();
    assert.match(await page.locator('#card').innerText(), /Welcome back/);
    await page.getByRole('button', { name: 'Resume studying' }).click();
    const afterResume = await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key));
      return { startedAt: value.exam.startedAt, durationMs: value.exam.durationMs, finishedAt: value.exam.finishedAt, view: value.view };
    }, timed.key);
    console.log('Timed exam reload diagnostics:', JSON.stringify({ persisted, afterResume }));
    assert.match(await page.locator('#card').innerText(), /Practice exam results/, 'Expired exam should finish on reload');
    // Check the main study interface at a phone-sized viewport.
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobileErrors = [];
    mobile.on('pageerror', err => mobileErrors.push(err.message));
    await mobile.goto(url);
    await mobile.locator('#card').waitFor();
    await mobile.screenshot({ path: path.join(root, 'test-artifacts', 'mobile-study.png'), fullPage: true });
    assert.ok(await mobile.locator('#install-app').isVisible(), 'Install button must be visible on mobile');
    const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(horizontalOverflow, false, 'Unexpected horizontal scrolling on mobile');
    await mobile.locator('#install-app').click();
    assert.ok(await mobile.locator('#card').isVisible(), 'Install click should not hide study screen');
    assert.deepEqual(mobileErrors, [], 'Mobile browser JavaScript errors');
    await mobile.close();
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    console.log('PASS: practice reload, exam resume/results, timed expiration, mobile layout and install controls.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => { console.error(err); process.exitCode = 1; server.close(); });
