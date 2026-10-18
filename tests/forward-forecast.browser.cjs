const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));

test('forward horizons repaint stable zones and open accessible actual vs projected trends', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let horizon = '7d', fail = false, empty = false, setup = false;
    const zone = () => ({ zone_id: '8875995025fffff', region_id: '8875995025fffff', zone_name: 'Market grid <test>',
      risk_level: horizon === '90d' ? 'high' : 'low', risk_score: horizon === '90d' ? 0.9 : 0.1,
      predicted_count: horizon === '90d' ? 24 : 2, predicted_lower_bound: 1, predicted_upper_bound: 31,
      growth_velocity_percent: 28.5, report_count: 60, rank: 1, center_lat: 14.575, center_lng: 121.075,
      historical_points: [{ week_start: '2026-10-05', actual_count: 3 }, { week_start: '2026-10-12', actual_count: 4 }],
      forecast_points: [{ week_start: '2026-10-19', predicted_count: 6, lower_bound: 1, upper_bound: 10 }, { week_start: '2026-10-26', predicted_count: 7, lower_bound: 2, upper_bound: 12 }] });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\/backend/, '');
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000, user: { id: 'test-officer', role: 'officer', full_name: 'QA Officer' } });
      if (path === '/api/spatial-forecast/forecast/current') {
        horizon = url.searchParams.get('horizon');
        if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' });
        if (setup) return json({ data: { horizon, status: 'setup_required', geojson: { type: 'FeatureCollection', features: [] } } });
        return json({ data: { horizon, horizon_days: parseInt(horizon), forecast_date_start: '2026-10-18T00:00:00Z', forecast_date_end: '2026-10-25T00:00:00Z', prediction_date: '2026-10-18',
          geojson: { type: 'FeatureCollection', features: empty ? [] : [{ type: 'Feature', properties: zone(), geometry: { type: 'Polygon', coordinates: [[[121.07,14.57],[121.08,14.57],[121.08,14.58],[121.07,14.58],[121.07,14.57]]] } }] } } });
      }
      if (path.endsWith('/trend')) return json({ data: zone() });
      if (path === '/api/spatial-forecast/available-dates') return json({ data: [] });
      if (path === '/rest/v1/public_reports') return json([{ id: 'today-report', created_at: new Date().toISOString(), location_lat: 14.575, location_lng: 121.075 }]);
      if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) return json([]);
      if (url.hostname.endsWith('.tile.openstreetmap.org')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2YQAAAAASUVORK5CYII=', 'base64') });
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/spatial-scan`);
    await page.getByRole('button', { name: '+90 Days (Quarterly)', exact: true }).waitFor();
    const polygons = page.locator('.leaflet-overlay-pane path.leaflet-interactive');
    await polygons.first().waitFor();
    await page.waitForTimeout(500);
    const shape = await polygons.first().getAttribute('d');
    assert.equal(await polygons.first().getAttribute('fill'), '#10B981');
    await page.getByRole('button', { name: '+90 Days (Quarterly)', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.leaflet-interactive[fill="#EF4444"]'));
    await page.waitForTimeout(500);
    assert.equal(await polygons.first().getAttribute('d'), shape, 'Horizon changes preserve the spatial partition');
    await polygons.first().focus();
    await polygons.first().press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Market grid <test>' });
    await drawer.waitFor();
    await drawer.getByText('24', { exact: true }).waitFor();
    await drawer.getByRole('img', { name: /Actual weekly reports and projected/ }).waitFor();
    assert.equal(await drawer.locator('img,script,iframe').count(), 0);
    assert.match(await drawer.innerText(), /95%/);
    assert.match(await drawer.innerText(), /28.5%/);
    await page.keyboard.press('Escape');
    assert.equal(await drawer.count(), 0);
    assert.equal(await polygons.first().evaluate(element => document.activeElement === element), true, 'Escape returns keyboard focus to the selected zone');
    for (const width of [1440, 1024, 768, 320]) {
      await page.setViewportSize({ width, height: 844 });
      if (width < 900) await page.getByRole('button', { name: 'Hotspots', exact: true }).click();
      await page.getByLabel('Hotspot results').getByRole('button').first().click();
      await drawer.waitFor();
      const bounds = await drawer.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await drawer.getByRole('button', { name: 'Close zone trend' }).click();
    }
    await page.getByRole('button', { name: 'Today (Actual)', exact: true }).click();
    await page.locator('.leaflet-heatmap-layer').waitFor();
    assert.equal(await polygons.count(), 0, 'Actual report layer is separate from future zones');
    await page.getByRole('button', { name: 'Hotspots', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.locator('.leaflet-heatmap-layer').waitFor();
    await page.getByRole('button', { name: 'Risk areas', exact: true }).click();
    fail = true;
    await page.getByRole('button', { name: '+30 Days (Monthly)', exact: true }).click();
    await page.getByText('Forecast map unavailable', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Retry forecast', exact: true }).isVisible());
    assert.equal(await polygons.count(), 0, 'Failed horizon does not retain earlier polygons');
    assert.deepEqual(errors, []);
    fail = false;
    empty = true;
    await page.getByRole('button', { name: '+7 Days (Short-term)', exact: true }).click();
    await page.getByText('No zones are available for this forecast.', { exact: true }).waitFor();
    assert.match(await page.getByText('Expected reports', { exact: true }).locator('..').innerText(), /—/);
    setup = true;
    await page.getByRole('button', { name: '+30 Days (Monthly)', exact: true }).click();
    await page.getByRole('status').filter({ hasText: /^Forecasting setup is incomplete/ }).waitFor();
    assert.equal(await polygons.count(), 0);
    if (process.env.ECOPIN_TEST_SCREENSHOT) {
      setup = false;
      empty = false;
      await page.getByRole('button', { name: '+90 Days (Quarterly)', exact: true }).click();
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.getByLabel('Hotspot results').getByRole('button').first().waitFor();
      await page.getByLabel('Hotspot results').getByRole('button').first().click();
      await drawer.waitFor();
      await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT });
    }
  } finally { await browser.close(); }
});

test('officers can filter areas, inspect chart values, and distinguish actual reports from forecasts', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let horizon = '7d';
    const properties = index => ({ zone_id: `synthetic-${index}`, region_id: `synthetic-${index}`, zone_name: `Pasig study grid synthetic-${index}`,
      risk_level: ['high','medium','low'][index], risk_score: [.9,.4,0][index], predicted_count: [20,7,0][index] * parseInt(horizon) / 7,
      predicted_lower_bound: index ? 0 : 12, predicted_upper_bound: index ? 20 : 35 * parseInt(horizon) / 7,
      growth_velocity_percent: [45,-12,0][index], center_lat: 14.575 + index * .007, center_lng: 121.075 + index * .008,
      historical_points: Array.from({ length: 13 }, (_, week) => ({ week_start: new Date(Date.UTC(2026,6,20 + week * 7)).toISOString(), actual_count: index ? 2 : 3 + week % 4 })),
      forecast_points: Array.from({ length: Math.ceil(parseInt(horizon) / 7) + 1 }, (_, week) => ({ week_start: new Date(Date.UTC(2026,9,12 + week * 7)).toISOString(), predicted_count: index ? 2 : 7 + week, lower_bound: 1, upper_bound: index ? 5 : 15 + week })) });
    const features = () => Array.from({ length: 3 }, (_, i) => {
      const p = properties(i), coordinates = Array.from({ length: 7 }, (_, j) => [p.center_lng + Math.cos(j * Math.PI / 3) * .003, p.center_lat + Math.sin(j * Math.PI / 3) * .003]);
      coordinates[6] = coordinates[0];
      return { type: 'Feature', properties: p, geometry: { type: 'Polygon', coordinates: [coordinates] } };
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url()), path = url.pathname.replace(/^\/api\/backend/, '');
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000, user: { id: 'qa-officer', role: 'officer', full_name: 'QA Officer' } });
      if (path === '/api/spatial-forecast/forecast/current') { horizon = url.searchParams.get('horizon'); return json({ data: { horizon, prediction_date: '2026-10-18', forecast_date_start: '2026-10-18', forecast_date_end: new Date(Date.UTC(2026,9,18 + parseInt(horizon))).toISOString(), geojson: { type: 'FeatureCollection', features: features() } } }); }
      if (path.endsWith('/trend')) return json({ data: properties(Number(path.split('/').at(-2).split('-').at(-1))) });
      if (path === '/api/spatial-forecast/available-dates') return json({ data: [] });
      if (path === '/rest/v1/public_reports') return json(Array.from({ length: 3 }, (_, i) => ({ id: `report-${i}`, created_at: new Date().toISOString(), location_lat: 14.575 + i * .003, location_lng: 121.075 })));
      if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) return json([]);
      if (url.hostname.endsWith('.tile.openstreetmap.org')) return process.env.ECOPIN_TEST_SCREENSHOT ? route.continue() : route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2YQAAAAASUVORK5CYII=', 'base64') });
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/spatial-scan`);
    await page.getByRole('heading', { name: 'Hotspot forecast', exact: true }).waitFor();
    const list = page.getByLabel('Hotspot results');
    await list.getByRole('button').filter({ hasText: 'Area 01' }).waitFor();
    assert.match(await page.getByText('Expected reports', { exact: true }).locator('..').innerText(), /27/);
    const high = page.getByRole('button', { name: 'View high-risk areas', exact: true });
    await high.click();
    assert.equal(await page.getByLabel('Filter forecast areas').inputValue(), 'high');
    assert.equal(await list.getByRole('button').count(), 1);
    assert.equal(await page.locator('.leaflet-overlay-pane path.leaflet-interactive').count(), 1);
    await page.getByLabel('Filter forecast areas').selectOption('all');
    const search = page.getByLabel('Search forecast areas');
    await search.fill('Area '); await search.press('End'); await search.type('02');
    assert.equal(await search.inputValue(), 'Area 02');
    assert.equal(await search.evaluate(input => input === document.activeElement), true);
    assert.equal(await list.getByRole('button').count(), 1);
    assert.match(await list.innerText(), /Area 02/);
    await search.fill('No such area');
    await list.getByRole('button', { name: 'Clear filters' }).click();
    assert.equal(await search.inputValue(), '');
    await page.getByRole('button', { name: 'View areas with rising activity' }).click();
    assert.equal(await list.getByRole('button').count(), 1);
    await page.getByRole('button', { name: 'View areas with rising activity' }).click();
    const overview = page.getByRole('region', { name: 'Forecast overview' });
    await overview.getByRole('img').focus(); await page.keyboard.press('ArrowRight');
    assert.match(await overview.getByRole('status').innerText(), /projected reports/);
    await page.getByRole('button', { name: '+90 Days (Quarterly)', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Forecast overview"]').textContent.includes('347'));
    await list.getByRole('button').filter({ hasText: 'Area 01' }).click();
    const drawer = page.getByRole('dialog', { name: 'Area 01' });
    await drawer.waitFor();
    const chart = drawer.getByRole('img');
    await chart.focus(); await page.keyboard.press('ArrowRight');
    assert.match(await drawer.getByRole('status').innerText(), /projected reports/);
    await drawer.getByRole('button', { name: 'Show likely range' }).click();
    assert.equal(await drawer.locator('svg polygon').count(), 0);
    await drawer.getByRole('button', { name: 'Show likely range' }).click();
    assert.equal(await drawer.locator('svg polygon').count(), 1);
    await page.keyboard.press('Escape');
    if (process.env.ECOPIN_TEST_SCREENSHOT) { await page.waitForTimeout(500); await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png','-officer-desktop.png') }); }
    await page.getByRole('button', { name: 'Today (Actual)' }).click();
    const today = page.getByRole('region', { name: 'Today’s report summary' });
    assert.match(await today.innerText(), /3/);
    assert.equal(await page.getByText('Expected reports', { exact: true }).count(), 0);
    await list.getByRole('button').first().click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Risk areas' }).click();
    for (const width of [768,390,320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: 'Hotspots', exact: true }).click();
      await list.getByRole('button').filter({ hasText: 'Area 01' }).click();
      await drawer.waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.env.ECOPIN_TEST_SCREENSHOT && width === 390) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png','-officer-mobile-trend.png') });
      await drawer.getByRole('button', { name: 'Close zone trend' }).click();
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      if (process.env.ECOPIN_TEST_SCREENSHOT && width === 390) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png','-officer-mobile.png') });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
