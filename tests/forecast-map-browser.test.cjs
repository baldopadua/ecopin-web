// Run against a local production build with Playwright available in NODE_PATH.
const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://127.0.0.1:4017';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const payload = `<img src=x onerror="window.auditXss=1"> &lt;svg onload="window.auditXss=2"&gt; ' &`;
const validProperties = {
  rank: 1, risk_level: 'high', risk_score: 0.8, report_count: 7,
  top_issue_type: 'illegal_dumping', issue_breakdown: { illegal_dumping: 7 },
  center_lat: 14.6, center_lng: 121.0, region_id: 'synthetic-region',
};

for (const field of [null, 'top_issue_type', 'breakdown_type', 'breakdown_count', 'rank', 'risk_level', 'report_count']) {
  test(`forecast ${field || 'valid content'} cannot create executable markup in current or historical maps`, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const properties = { ...validProperties };
      if (field === 'breakdown_type') properties.issue_breakdown = { [payload]: 7 };
      else if (field === 'breakdown_count') properties.issue_breakdown = { illegal_dumping: payload };
      else if (field) properties[field] = payload;
      const geometry = { type: 'Polygon', coordinates: [[[120.999, 14.599], [121.001, 14.599], [121.001, 14.601], [120.999, 14.601], [120.999, 14.599]]] };
      const forecast = { geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry, properties }] } };
      const user = { id: 'synthetic-officer', role: 'officer', full_name: 'QA Officer' };
      const token = ['synthetic', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'invalid-signature'].join('.');
      let mutations = 0, historicalOnly = false;
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        // All service responses are synthetic; never forward a test credential.
        if (url.pathname === '/api/auth/login') return json({ token, user });
        if (url.pathname === '/api/auth/me') return json({ user });
        if (url.pathname === '/api/auth/validate-session') return json({ valid: true });
        if (url.pathname === '/api/admin/timeout') return json({ session_timeout_minutes: 60 });
        if (url.pathname.includes('/api/spatial-forecast/current/')) return json({ data: historicalOnly ? { geojson: { type: 'FeatureCollection', features: [] } } : forecast });
        if (url.pathname === '/api/spatial-forecast/available-dates') return json({ data: ['2026-10-15'] });
        if (url.pathname === '/api/spatial-forecast/predictions') return json({ data: [{ ...properties, region_center_lat: 14.6, region_center_lng: 121.0, geojson_polygon: geometry }] });
        if (url.pathname === '/api/spatial-forecast/accuracy') return json({ data: null });
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/')) {
          if (!['GET', 'OPTIONS'].includes(request.method())) mutations++;
          return json([]);
        }
        if (url.origin === new URL(base).origin) return route.continue();
        return route.abort();
      });
      await page.goto(`${base}/auth`);
      await page.getByLabel('Email address').fill('qa@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('**/dashboard/officer');
      await page.goto(`${base}/dashboard/spatial-scan`);
      for (const historical of [false, true]) {
        if (historical) {
          // Mount the historical map afresh, so a stale current layer cannot pass.
          historicalOnly = true;
          await page.reload();
          await page.getByRole('button', { name: 'Historical snapshots', exact: true }).click();
        }
        const polygon = page.locator('.leaflet-overlay-pane path.leaflet-interactive').first();
        await polygon.click();
        const popup = page.locator('.leaflet-popup-content');
        await popup.waitFor();
        assert.equal(await popup.locator('img,script,svg,iframe,object').count(), 0);
        assert.equal(await page.locator('.leaflet-marker-icon img').count(), 0);
        assert.equal(await page.evaluate(() => window.auditXss || 0), 0);
        assert.match(await popup.innerText(), /Issue Breakdown/);
        // textContent ignores the existing CSS capitalization of issue labels.
        if (field && field !== 'risk_level') assert.ok((await popup.textContent()).includes(payload));
        if (field === 'risk_level') assert.match(await popup.innerText(), /unknown risk/);
        if (!field) {
          assert.match(await popup.innerText(), /Cluster #1/);
          assert.match(await popup.innerText(), /80%/);
          assert.match(await popup.innerText(), /14\.60000, 121\.00000/);
        }
        if (field === 'top_issue_type' && historical && process.env.ECOPIN_TEST_SCREENSHOT) {
          await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT });
        }
        await page.getByRole('button', { name: 'Close popup' }).click();
      }
      assert.deepEqual(errors, []);
      assert.equal(mutations, 0);
      await context.close();
    } finally {
      await browser.close();
    }
  });
}
