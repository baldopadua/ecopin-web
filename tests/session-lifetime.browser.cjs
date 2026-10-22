const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

test('web sessions survive inactivity and temporary outages, then end at the fixed deadline', async () => {
  const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const started = Date.now(), day = 24 * 60 * 60 * 1000;
    const expiresAt = started + 30 * day;
    let unavailable = false, logouts = 0, checks = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: started });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\/backend/, '');
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/api/session') {
        checks++;
        return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt,
          user: { id: 'admin-test', role: 'admin', full_name: 'Test Admin' } }, unavailable ? 503 : 200);
      }
      if (path === '/api/session/logout') { logouts++; return json({ success: true }); }
      if (path === '/api/admin/settings') return json({ password_min_length: 8, session_timeout_minutes: 15 });
      if (path.startsWith('/api/')) return json([]);
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/admin/settings`);
    await page.getByText('30 days after sign-in', { exact: true }).waitFor();
    assert.equal(await page.getByText('Session Timeout (minutes)', { exact: true }).count(), 0);
    await page.clock.setSystemTime(started + 29 * day);
    const previousChecks = checks;
    await page.clock.runFor(60001);
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'System Settings');
    assert.ok(checks > previousChecks);
    assert.equal(logouts, 0, '29 days without activity must not log out');
    unavailable = true;
    await page.clock.runFor(60001);
    await page.waitForTimeout(100);
    assert.equal(logouts, 0, 'A temporary session-check failure must not log out');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.clock.setSystemTime(expiresAt);
    await page.clock.runFor(60001);
    await page.getByRole('heading', { name: 'Sign in to continue', exact: true }).waitFor();
    assert.equal(logouts, 1, 'The fixed deadline logs out even while the server is unavailable');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
