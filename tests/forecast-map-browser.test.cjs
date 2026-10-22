// Run against a local build with Playwright available in NODE_PATH.
const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const payload = `<img src=x onerror="window.auditXss=1"> &lt;svg onload="window.auditXss=2"&gt; ' &`;

for (const field of [null, 'zone_name', 'zone_id', 'risk_level', 'predicted_count', 'growth_velocity_percent', 'history_date']) {
  test(`forward forecast ${field || 'valid content'} remains inert in current and saved zone views`, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const properties = { zone_id: 'synthetic-zone', region_id: 'synthetic-zone', zone_name: 'Market grid', risk_level: 'high', risk_score: .8,
        predicted_count: 24, predicted_lower_bound: 15, predicted_upper_bound: 31, growth_velocity_percent: 28.5,
        center_lat: 14.6, center_lng: 121.075, historical_points: [{ week_start: '2026-10-05', actual_count: 7 }],
        forecast_points: [{ week_start: '2026-10-19', predicted_count: 24, lower_bound: 15, upper_bound: 31 }] };
      if (field === 'history_date') properties.historical_points[0].week_start = payload;
      else if (field) properties[field] = payload;
      const geometry = { type: 'Polygon', coordinates: [[[121.07,14.595],[121.08,14.595],[121.08,14.605],[121.07,14.605],[121.07,14.595]]] };
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api\/backend/, '');
        const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        if (path === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000, user: { id: 'synthetic-officer', role: 'officer', full_name: 'QA Officer' } });
        if (path === '/api/spatial-forecast/forecast/current') return json({ data: { geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry, properties }] } } });
        if (path.endsWith('/trend')) return json({ data: properties });
        if (path === '/api/spatial-forecast/available-dates') return json({ data: ['2026-10-15'] });
        if (path === '/api/spatial-forecast/predictions') return json({ data: [{ ...properties, geojson_polygon: geometry }] });
        if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) return json([]);
        return url.origin === new URL(base).origin ? route.continue() : route.abort();
      });
      await page.goto(`${base}/dashboard/spatial-scan`);
      for (const historical of [false, true]) {
        if (historical) await page.getByRole('button', { name: 'Historical snapshots', exact: true }).click();
        const polygon = page.locator('.leaflet-overlay-pane path.leaflet-interactive').first();
        await polygon.focus();
        await polygon.press('Enter');
        const drawer = page.getByRole('dialog');
        await drawer.waitFor();
        assert.equal(await drawer.locator('img,script,iframe,object').count(), 0);
        assert.equal(await drawer.locator('svg img,svg script').count(), 0);
        assert.equal(await page.locator('.leaflet-marker-icon img').count(), 0);
        assert.equal(await page.evaluate(() => window.auditXss || 0), 0);
        if (field === 'zone_name' || field === 'risk_level') assert.ok((await drawer.textContent()).includes(payload));
        if (!field) {
          assert.match(await drawer.innerText(), /24/);
          assert.match(await drawer.innerText(), /15.0–31.0/);
        }
        await page.keyboard.press('Escape');
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
