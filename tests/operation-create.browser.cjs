const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const cluster = '2737c095-00c3-419c-be74-166690679a1d';

test('operation creation preserves the header, fits its workspace, and retains selections through pagination', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], created = [];
    page.on('pageerror', error => errors.push(error.message));
    const reports = Array.from({ length: 24 }, (_, i) => ({ id: `report-${i}`, title: `Waste concern ${i + 1}`, issue_type: 'illegal_dumping',
      description: 'Reported waste near the neighborhood street.', cluster_id: i < 3 ? cluster : null,
      status: 'unresolved', validation_status: 'approved', latitude: 14.58 + i / 10000, longitude: 121.08, created_at: '2026-10-15T00:00:00Z' }));
    const crews = Array.from({ length: 12 }, (_, i) => ({ id: `crew-${i}`, full_name: `Field crew ${i + 1}`, members: [{ id: `member-${i}` }] }));
    let previewMode = 'success', emptyData = false;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\/backend/, '');
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000,
        user: { id: 'officer-qa', role: 'officer', full_name: 'QA Officer' } });
      if (path === '/rest/v1/public_reports') return json(emptyData ? [] : reports);
      if (path === '/api/cleanup-tasks/available-crew') return json(emptyData ? [] : crews);
      if (path === '/api/cleanup-tasks/custom') { created.push(route.request().postDataJSON()); return json({ id: 'created-task' }); }
      if (path === '/api/tasks/auto-generate/preview') {
        if (previewMode === 'error') return json({ error: 'Synthetic preview failure' }, 503);
        return json({ tasks: previewMode === 'empty' ? [] : Array.from({ length: 4 }, (_, i) => ({
          primary_target_id: `report-${i}`, primary_target_is_cluster: false, primary_priority: i === 2 ? 25 : 18,
          included_reports: [], cumulative_detour_minutes: 4, ...(i !== 1 ? { estimated_distance_km: 12 } : {}),
        })) });
      }
      if (url.hostname.endsWith('.tile.openstreetmap.org')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2YQAAAAASUVORK5CYII=', 'base64') });
      if (path.startsWith('/api/') || path.startsWith('/rest/v1/')) return json([]);
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await page.goto(`${base}/dashboard/officer/operations/create?preselect=${cluster}`);
    await page.getByRole('checkbox', { name: 'Select Waste concern 1', exact: true }).waitFor();
    await page.waitForFunction(() => document.body.textContent.includes('Reports (3 selected)'));
    const assertFits = async label => {
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('#workspace-content');
        return { page: main.scrollHeight > main.clientHeight + 1, horizontal: main.scrollWidth > main.clientWidth + 1,
          lists: [...main.querySelectorAll('ul[aria-label]')].filter(list => list.clientHeight && list.scrollHeight > list.clientHeight + 1).length };
      });
      assert.deepEqual(overflow, { page: false, horizontal: false, lists: 0 }, label);
      assert.ok(await page.getByRole('heading', { name: 'Create Cleanup Task', exact: true }).isVisible());
      assert.ok(await page.getByRole('navigation', { name: 'Breadcrumb' }).isVisible());
      assert.ok(await page.getByText('Select reports on the map manually or auto-generate cleanup tasks', { exact: true }).isVisible());
      const modes = page.getByRole('group', { name: 'Task creation mode' });
      assert.ok(await modes.evaluate(group => !!group.closest('header')), 'Mode choices belong in the header');
      if (page.viewportSize().width >= 900) {
        const heading = await page.getByRole('heading', { name: 'Create Cleanup Task', exact: true }).boundingBox();
        const choices = await modes.boundingBox();
        assert.ok(choices.x >= heading.x + heading.width, 'Mode choices sit right of the heading');
      }
    };
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await assertFits(`manual ${viewport.width}x${viewport.height}`);
      for (const name of ['Select reports on map', 'Report selection', 'Task details']) assert.ok(await page.getByRole('region', { name, exact: true }).isVisible());
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    const details = page.getByRole('region', { name: 'Task details', exact: true });
    await page.getByLabel('Task Title *', { exact: true }).fill('Neighborhood cleanup');
    await page.getByLabel('Description', { exact: true }).fill('Clear the reported waste.');
    await page.getByLabel('Priority Level *', { exact: true }).selectOption('high');
    await details.getByText('Field crew 1', { exact: true }).click();
    await details.getByRole('button', { name: 'Next Field crew', exact: true }).click();
    await details.getByRole('button', { name: 'Previous Field crew', exact: true }).click();
    assert.ok(await details.getByRole('checkbox', { name: 'Field crew 1', exact: true }).isChecked());
    await page.getByRole('button', { name: 'Next Reports', exact: true }).click();
    await page.getByRole('button', { name: 'Previous Reports', exact: true }).click();
    assert.ok(await page.getByRole('checkbox', { name: 'Select Waste concern 1', exact: true }).isChecked());
    if (process.env.ECOPIN_TEST_SCREENSHOT) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const name of ['Reports', 'Task details', 'Map']) {
        await page.getByRole('group', { name: 'Manual workspace view' }).getByRole('button', { name, exact: true }).click();
        await assertFits(`compact ${width} ${name}`);
      }
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole('button', { name: 'Auto-generate tasks', exact: true }).click();
    await page.getByRole('button', { name: /Advanced route tweaks/ }).click();
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await assertFits(`advanced ${viewport.width}x${viewport.height}`);
      const advancedBottom = await page.getByLabel('Shift cap (mins)', { exact: true }).boundingBox();
      const preview = await page.getByRole('button', { name: 'Preview Tasks', exact: true }).boundingBox();
      assert.ok(advancedBottom.y + advancedBottom.height <= preview.y, 'Advanced fields do not overlap the preview action');
      const tweaks = page.locator('#route-tweaks input');
      for (let i = 0; i < 6; i += 2) {
        const left = await tweaks.nth(i).boundingBox();
        const right = await tweaks.nth(i + 1).boundingBox();
        assert.ok(Math.abs(left.y - right.y) <= 1, `Advanced inputs ${i + 1} and ${i + 2} align`);
      }
    }
    if (process.env.ECOPIN_TEST_SCREENSHOT) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png', '-advanced.png') });
    await page.getByRole('button', { name: 'Preview Tasks', exact: true }).click();
    await page.getByLabel('Task title', { exact: true }).waitFor();
    await assertFits('generated routes');
    if (process.env.ECOPIN_TEST_SCREENSHOT) await page.screenshot({ path: process.env.ECOPIN_TEST_SCREENSHOT.replace('.png', '-proposals.png') });
    await page.getByText('Est. travel: ~24 min', { exact: true }).waitFor();
    await page.getByText('Shift cap: 480 min', { exact: true }).waitFor();
    assert.match(await page.getByLabel('Task title', { exact: true }).inputValue(), /^Proposed Cleanup Task #1/);
    await page.getByLabel('Task title', { exact: true }).fill('Edited route one');
    await page.getByRole('group', { name: 'Assign task crew' }).getByRole('checkbox', { name: 'Field crew 1', exact: true }).check();
    await page.getByRole('button', { name: 'Next task', exact: true }).click();
    await page.getByText('Est. travel: unavailable', { exact: true }).waitFor();
    await page.getByRole('group', { name: 'Assign task crew' }).getByText('Field crew 2', { exact: true }).click();
    await page.getByRole('button', { name: 'Previous task', exact: true }).click();
    assert.equal(await page.getByLabel('Task title', { exact: true }).inputValue(), 'Edited route one');
    assert.ok(await page.getByRole('group', { name: 'Assign task crew' }).getByRole('checkbox', { name: 'Field crew 1', exact: true }).isChecked());
    await page.getByRole('button', { name: 'Confirm & Dispatch', exact: true }).click();
    await page.getByText('Please assign crew to all proposed cleanup tasks before confirming.', { exact: true }).waitFor();
    assert.equal(created.length, 0, 'Pagination must not bypass validation of other routes');
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const views = page.getByRole('group', { name: 'Auto workspace view' });
      await views.getByRole('button', { name: 'Task setup', exact: true }).click();
      const previous = page.getByRole('button', { name: 'Previous settings', exact: true });
      while (await previous.isEnabled()) await previous.click();
      for (let step = 0; step < 3; step++) {
        await assertFits(`compact advanced ${width} page ${step + 1}`);
        const last = await page.getByRole('region', { name: 'Auto-task setup' }).locator('input:visible').last().boundingBox();
        const preview = await page.getByRole('button', { name: 'Preview Tasks', exact: true }).boundingBox();
        assert.ok(last.y + last.height <= preview.y);
        if (step < 2) await page.getByRole('button', { name: 'Next settings', exact: true }).click();
      }
      await views.getByRole('button', { name: 'Proposed tasks', exact: true }).click();
      await assertFits(`compact generated ${width}`);
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    previewMode = 'error';
    await page.getByRole('button', { name: 'Preview Tasks', exact: true }).click();
    await page.getByRole('heading', { name: 'Task Generation Failed', exact: true }).waitFor();
    await assertFits('preview failure');
    previewMode = 'empty';
    await page.getByRole('button', { name: 'Retry Generation', exact: true }).click();
    await page.getByRole('heading', { name: 'No Tasks Generated', exact: true }).waitFor();
    await assertFits('empty preview');
    await page.getByRole('button', { name: 'Manual mode', exact: true }).click();
    await page.getByRole('button', { name: 'Create Cleanup Task', exact: true }).click();
    await page.waitForFunction(() => document.body.textContent.includes('Cleanup task created successfully'));
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].report_ids.sort(), ['report-0', 'report-1', 'report-2']);
    assert.deepEqual(created[0].assigned_crew_ids, ['member-0']);
    assert.equal(created[0].priority, 'high');
    assert.equal(created[0].title, 'Neighborhood cleanup');
    emptyData = true;
    await page.reload();
    await page.getByText(/No unassigned reports available/).waitFor();
    await assertFits('empty reports and crews');
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByRole('group', { name: 'Manual workspace view' }).getByRole('button', { name: 'Task details', exact: true }).click();
    await assertFits('compact empty crews');
    assert.ok(await page.getByText('No field crew members available', { exact: true }).isVisible());
    emptyData = false;
    previewMode = 'success';
    await page.reload();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole('button', { name: 'Auto-generate tasks', exact: true }).click();
    await page.getByRole('button', { name: 'Preview Tasks', exact: true }).click();
    await page.getByLabel('Task title', { exact: true }).waitFor();
    created.length = 0;
    await page.getByLabel('Generate', { exact: true }).selectOption('single');
    assert.equal(await page.getByRole('button', { name: 'Confirm & Dispatch', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Preview Tasks', exact: true }).click();
    await page.getByText('Task 1 of 1', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Next task', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Confirm & Dispatch', exact: true }).click();
    await page.getByText('Tasks dispatched successfully!', { exact: true }).waitFor();
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].report_ids, ['report-2'], 'Single-task mode dispatches the highest priority proposal only');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
