const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));

test('officer command center keeps all sections visible without page or panel scrolling', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let empty = false;
    const tasks = Array.from({ length: 8 }, (_, i) => ({ id: `task-${i}`, title: `Cleanup operation ${i + 1}`, status: 'in_progress',
      description: 'Clear reported waste near the neighborhood street and inspect drainage.', assigned_crew_ids: ['crew-1', 'crew-2'], report_ids: ['report-1'] }));
    const clusters = Array.from({ length: 9 }, (_, i) => ({ id: `zone-${i}`, title: `Drainage clearance ${i + 1}`, label: `Neighborhood hotzone ${i + 1}`,
      priority_score: 90 - i, report_count: 7, radius_meters: 150 }));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\/backend/, '');
      const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000,
        user: { id: 'test-officer', role: 'officer', full_name: 'QA Officer' } });
      if (path === '/api/cleanup-tasks') return json(empty ? [] : tasks);
      if (path === '/api/clusters' || /work-queue|\/queue$/.test(path)) return json(empty ? [] : clusters);
      if (path === '/rest/v1/public_reports') return json(empty ? [] : [{ id: 'report-1', status: 'pending', validation_status: 'manual_review', created_at: '2026-10-01T00:00:00Z' }]);
      if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) return json([]);
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/officer`);
    await page.getByRole('link', { name: /Cleanup operation 1/ }).waitFor();
    const sla = page.getByRole('link', { name: /^SLA Risk/ });
    assert.notEqual(await sla.evaluate(card => getComputedStyle(card).animationName), 'none', 'Nonzero SLA risk glows');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await sla.evaluate(card => getComputedStyle(card).animationName), 'none');
    assert.notEqual(await sla.evaluate(card => getComputedStyle(card).boxShadow), 'none', 'Reduced motion retains a static alert');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 600 },
      { width: 1024, height: 768 }, { width: 768, height: 844 }, { width: 390, height: 667 }, { width: 320, height: 740 }, { width: 320, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('#workspace-content');
        const panels = [...document.querySelectorAll('[data-command-panel]')];
        return { page: main.scrollHeight > main.clientHeight + 1, horizontal: main.scrollWidth > main.clientWidth + 1,
          panels: panels.filter(panel => panel.scrollHeight > panel.clientHeight + 1).length,
          lists: panels.filter(panel => { const list = panel.querySelector('ul'); return list.scrollHeight > list.clientHeight + 1; }).length };
      });
      assert.deepEqual(overflow, { page: false, horizontal: false, panels: 0, lists: 0 }, JSON.stringify(viewport));
      for (const title of ['Active Targets', 'Action Queue', 'Critical Hotzones']) {
        const panel = page.getByRole('region', { name: title, exact: true });
        assert.ok(await panel.isVisible());
        const bounds = await panel.boundingBox();
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, `${title} fits ${viewport.width}`);
        const heading = await panel.getByRole('heading').boundingBox();
        const all = await panel.getByRole('link', { name: `View all ${title}` }).boundingBox();
        if (Math.abs(heading.y - all.y) < 44) assert.ok(heading.x + heading.width <= all.x, `${title} controls do not overlap`);
      }
      assert.ok(await page.getByRole('link', { name: /Run Optimization/ }).isVisible());
    }
    await page.getByRole('button', { name: 'Next Active Targets' }).click();
    assert.ok(await page.getByRole('link', { name: /Cleanup operation 2/ }).isVisible());
    if (process.env.ECOPIN_TEST_SCREENSHOT) {
      await page.setViewportSize({ width: 390, height: 667 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png', '-mobile.png') });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    if (process.env.ECOPIN_TEST_SCREENSHOT) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT });
    empty = true;
    await page.reload();
    await page.getByText('No in-progress cleanup tasks', { exact: true }).waitFor();
    assert.equal(await sla.evaluate(card => getComputedStyle(card).animationName), 'none', 'Zero SLA risk does not glow');
    assert.equal(await sla.evaluate(card => getComputedStyle(card).boxShadow), 'none');
    assert.ok(await page.getByText('Queue is empty', { exact: true }).isVisible());
    assert.ok(await page.getByText('No hotzones detected', { exact: true }).isVisible());
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
