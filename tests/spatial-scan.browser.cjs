const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));

test('spatial workspace fits laptops, paginates hotspots, and supports compact views', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const user = { id: 'synthetic-officer', role: 'officer', full_name: 'QA Officer' };
    const features = Array.from({ length: 25 }, (_, i) => ({
      type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[121, 14.6], [121.001, 14.6], [121.001, 14.601], [121, 14.6]]] },
      properties: { region_id: `area-${i}`, zone_id: `area-${i}`, zone_name: `Forecast zone ${i + 1}`, rank: i + 1, risk_level: 'high', risk_score: 1 - i / 100,
        predicted_count: 7, predicted_lower_bound: 2, predicted_upper_bound: 12, growth_velocity_percent: 10,
        historical_points: [], forecast_points: [], report_count: 7, center_lat: 14.6, center_lng: 121 },
    }));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      url.pathname = url.pathname.replace(/^\/api\/backend/, '');
      if (url.hostname.endsWith('.tile.openstreetmap.org')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2YQAAAAASUVORK5CYII=', 'base64') });
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000, user });
      if (url.pathname === '/api/auth/me') return json({ user });
      if (url.pathname === '/api/auth/validate-session') return json({ valid: true });
      if (url.pathname === '/api/admin/timeout') return json({ session_timeout_minutes: 60 });
      if (url.pathname === '/api/spatial-forecast/forecast/current') return json({ data: { horizon: url.searchParams.get('horizon'), geojson: { type: 'FeatureCollection', features } } });
      if (url.pathname.endsWith('/trend')) return json({ data: features[0].properties });
      if (url.pathname === '/api/spatial-forecast/available-dates') return json({ data: ['2026-10-14', '2026-10-15'] });
      if (url.pathname === '/api/spatial-forecast/predictions') return json({ data: features.map(f => ({ ...f.properties, geojson_polygon: f.geometry, region_center_lat: 14.6, region_center_lng: 121 })) });
      if (url.pathname === '/api/spatial-forecast/accuracy') return json({ data: { averageAccuracy: 0.9 } });
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/')) return json([]);
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/spatial-scan`);
    await page.getByRole('button', { name: 'Next hotspots' }).waitFor();
    const assertFits = async () => {
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('#workspace-content');
        const list = document.querySelector('[aria-label="Hotspot results"]');
        return { page: main.scrollHeight > main.clientHeight + 1, horizontal: main.scrollWidth > main.clientWidth + 1,
          list: list.scrollHeight > list.clientHeight + 1 };
      });
      assert.deepEqual(overflow, { page: false, horizontal: false, list: false }, JSON.stringify(page.viewportSize()));
      const timeline = page.getByRole('region', { name: 'Historical playback' });
      if (await timeline.count()) { const playback = await timeline.boundingBox(); assert.ok(playback.y + playback.height <= page.viewportSize().height); }
    };
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await assertFits();
      assert.equal(await page.getByRole('group', { name: 'Workspace view' }).isVisible(), false);
    }
    const firstArea = await page.getByLabel('Hotspot results').getByRole('button').first().innerText();
    await page.getByRole('button', { name: 'Next hotspots' }).click();
    assert.notEqual(await page.getByLabel('Hotspot results').getByRole('button').first().innerText(), firstArea);
    await page.getByLabel('Hotspot results').getByRole('button').first().click();
    assert.equal(await page.getByLabel('Hotspot results').getByRole('button').first().getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Close zone trend' }).click();
    await page.getByRole('button', { name: 'Historical snapshots', exact: true }).click();
    await page.getByLabel('Forecast date', { exact: true }).selectOption('2026-10-14');
    assert.equal(await page.getByLabel('Forecast date', { exact: true }).inputValue(), '2026-10-14');
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: 'Hotspots', exact: true }).click();
      await assertFits();
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      await assertFits();
    }
    assert.deepEqual(errors, []);
    if (process.env.ECOPIN_TEST_SCREENSHOT) {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT });
    }
  } finally { await browser.close(); }
});
