const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const screenshots = process.env.ECOPIN_SCREENSHOT_DIR
const inspectOnly = process.env.ECOPIN_INSPECT_LAYOUT === '1'
const now = new Date().toISOString()
const users = Array.from({ length: 40 }, (_, i) => ({ id: `user-${i}`, full_name: `Pasig Staff ${i + 1}`, email: `staff${i + 1}@example.test`, role: i % 2 ? 'officer' : 'citizen', created_at: now }))
const reports = Array.from({ length: 40 }, (_, i) => ({ id: `report-${i}`, title: `Reported waste near residential block ${i + 1}`, description: 'Waste near a neighborhood drainage inlet.', issue_type: 'waste', status: i % 2 ? 'unresolved' : 'in_progress', validation_status: 'approved', created_at: now, latitude: 14.6, longitude: 121.08, cluster_id: `zone-${i % 12}`, lifecycle_stage: 'assigned' }))
const clusters = Array.from({ length: 20 }, (_, i) => ({ id: `zone-${i}`, label: `Neighborhood hotzone ${i + 1}`, severity: 'high', issue_type: 'waste', status: 'unresolved', report_count: 4, priority_score: 80, radius_meters: 80, centroid_lat: 14.6, centroid_lng: 121.08, report_ids: ['report-0'], reports: reports.slice(0, 4) }))
const tasks = Array.from({ length: 16 }, (_, i) => ({ id: `task-${i}`, title: `Neighborhood cleanup ${i + 1}`, description: 'Inspect the drainage inlet and clear reported waste.', status: 'in_progress', created_at: now, report_ids: ['report-0'], assigned_crew_ids: ['user-1'], reports: reports.slice(0, 2) }))
const logs = Array.from({ length: 60 }, (_, i) => ({ id: `log-${i}`, created_at: now, user_name: 'Pasig Staff', user_id: 'user-1', event_type: 'profile_updated', entity_type: 'profile', entity_id: 'user-1', event_data: { action: 'Role updated' }, profiles: users[1], action_type: 'profile_update', action_details: 'Updated account information', ip_address: '127.0.0.1' }))
const runs = Array.from({ length: 30 }, (_, i) => ({ id: `run-${i}`, status: 'approved', created_at: now, num_tasks_optimized: 4, num_crews: 2, routes: [], weather_condition: 'normal', traffic_condition: 'low' }))
const workTimes = { waste: 30, flooding: 45, pollution: 20, infrastructure: 35, illegal_logging: 25, pending: 40, others: 15 }
const forecasts = Array.from({ length: 25 }, (_, i) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[121.08, 14.6], [121.081, 14.6], [121.081, 14.601], [121.08, 14.6]]] }, properties: { zone_id: `forecast-${i}`, zone_name: `Forecast zone ${i + 1}`, rank: i + 1, risk_level: 'high', risk_score: .9, predicted_count: 7, predicted_lower_bound: 2, predicted_upper_bound: 12, historical_points: [], forecast_points: [], report_count: 7, center_lat: 14.6, center_lng: 121.08 } }))

async function fixtures(context, role) {
  const user = { id: `test-${role}`, role, full_name: 'Pasig Test Staff', email: 'staff@example.test' }
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname.replace(/^\/api\/backend/, '')
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname.includes('tile.openstreetmap') || url.hostname.includes('basemaps.cartocdn')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2YQAAAAASUVORK5CYII=', 'base64') })
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/rest/v1/')) return url.origin === new URL(base).origin ? route.continue() : route.abort()
    if (pathname === '/api/session') return json({ state: 'full', sessionTag: 'a'.repeat(22), expiresAt: Date.now() + 3600000, user })
    if (pathname.endsWith('/auth/me')) return json({ user })
    if (pathname.endsWith('/validate-session')) return json({ valid: true })
    if (pathname.endsWith('/profile')) return json({ profile: user })
    if (pathname.endsWith('/admin/users')) return json({ users, total: users.length })
    if (pathname.endsWith('/admin/system-logs') || pathname.endsWith('/admin/audit-logs')) return json({ logs, total: logs.length })
    if (pathname.endsWith('/archive/status')) return json({ total_records: 60, eligible_for_archival: 0, hot_retention_days: 180, worm_retention_years: 7 })
    if (pathname.endsWith('/stats')) return json({ users: { total: 40, byRole: { citizen: 20, officer: 20 } }, reports: { total: 40, byStatus: { unresolved: 20 } }, systemLogs: { total: 60 } })
    if (pathname.endsWith('/optimization/settings')) return json([{ key: 'swmo_depot', value: { name: 'Pasig depot', latitude: 14.6, longitude: 121.08 } }])
    if (pathname.endsWith('/settings') || pathname.endsWith('/timeout')) return json({ session_timeout_minutes: 60, password_min_length: 8 })
    if (pathname.endsWith('/sweeper/config')) return json({ slaThreshold: 48, workTimes })
    if (pathname.endsWith('/optimization/runs')) return json(runs)
    if (pathname.includes('/optimization/runs/')) return json(runs[0])
    if (pathname.endsWith('/optimization/queue')) return json(clusters)
    if (pathname.endsWith('/optimization/config')) return json({})
    if (pathname.endsWith('/optimization/crews')) return json([{ id: 'crew-1', name: 'Pasig cleanup team', status: 'available', shift_start: '08:00', shift_end: '17:00', max_tasks_per_shift: 10, members: [users[1]], supports_standard: true }])
    if (pathname.endsWith('/cleanup-tasks')) return json(tasks)
    if (pathname.match(/\/cleanup-tasks\/task-\d+$/)) return json({ ...tasks[0], reports: reports.slice(0, 2) })
    if (pathname.endsWith('/clusters')) return json(clusters)
    if (pathname.match(/\/clusters\/zone-\d+$/)) return json({ ...clusters[0], reports: reports.slice(0, 4) })
    if (/work-queue|\/queue$/.test(pathname)) return json(clusters)
    if (pathname.includes('issue-types') || pathname.includes('issue_types')) return json(Object.keys(workTimes))
    if (pathname.includes('/public_reports') || pathname.endsWith('/reports')) return json(reports)
    if (pathname.match(/\/reports\/report-\d+$/)) return json(reports[0])
    if (pathname.endsWith('/forecast/current')) return json({ data: { horizon: '7d', prediction_date: now.slice(0, 10), geojson: { type: 'FeatureCollection', features: forecasts } } })
    if (pathname.endsWith('/available-dates')) return json({ data: ['2026-10-14', '2026-10-15'] })
    if (pathname.endsWith('/predictions')) return json({ data: forecasts.map(feature => ({ ...feature.properties, geojson_polygon: feature.geometry, region_center_lat: 14.6, region_center_lng: 121.08 })) })
    if (pathname.endsWith('/trend')) return json({ data: forecasts[0].properties })
    if (pathname.startsWith('/api/') || pathname.startsWith('/rest/v1/')) return json([])
    return url.origin === new URL(base).origin ? route.continue() : route.abort()
  })
}

const routes = {
  officer: ['officer', 'officer/map-grid', 'officer/hotzone-intel', 'officer/operations', 'officer/optimization', 'officer/reports', 'officer/metrics', 'spatial-scan', 'officer/hotzone-intel/zone-0', 'officer/optimization/run-0', 'raw-data', 'raw-data/report-0', 'map-grid', 'officer/operations/task-0', 'officer/operations/create', 'officer/crew-management', 'officer/sweeper-analytics', 'profile'],
  admin: ['admin', 'admin/users', 'admin/settings', 'admin/infrastructure', 'admin/optimization-settings', 'admin/sweeper-settings', 'admin/audit-logs', 'admin/sys-logs']
}
const fitted = new Set(['officer', 'officer/map-grid', 'officer/hotzone-intel', 'officer/operations', 'officer/optimization', 'officer/reports', 'officer/metrics', 'spatial-scan', 'raw-data', 'map-grid', 'admin', 'admin/users', 'admin/settings', 'admin/infrastructure', 'admin/optimization-settings', 'admin/sweeper-settings', 'admin/audit-logs', 'admin/sys-logs'])

async function layout(page) {
  return page.locator('#workspace-content').evaluate(main => ({
    overflowX: main.scrollWidth > main.clientWidth + 1,
    overflowY: main.scrollHeight > main.clientHeight + 1,
    titles: main.querySelectorAll('h1').length,
    fontSize: getComputedStyle(main.querySelector('h1')).fontSize,
    rows: main.querySelectorAll('tbody tr').length,
    body: main.innerText.slice(0, 160),
    table: (() => { const table = main.querySelector('.ecopin-table'); return table && { height: table.clientHeight, viewport: table.parentElement.parentElement.clientHeight, row: table.querySelector('tbody tr')?.clientHeight, header: table.querySelector('thead')?.clientHeight } })(),
    blocks: [...main.children[0].children].map(element => ({ tag: element.tagName, class: element.className, height: Math.round(element.getBoundingClientRect().height) }))
  }))
}

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  const findings = []
  try {
    for (const theme of ['light', 'dark']) for (const [role, paths] of Object.entries(routes)) {
      if (process.env.ECOPIN_THEME_FILTER && theme !== process.env.ECOPIN_THEME_FILTER) continue
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(context, role)
      const page = await context.newPage()
      page.setDefaultTimeout(20000)
      page.setDefaultNavigationTimeout(60000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      for (const route of paths) {
        if (process.env.ECOPIN_ROUTE_FILTER && !route.includes(process.env.ECOPIN_ROUTE_FILTER)) continue
        try {
          await page.goto(`${base}/dashboard/${route}`, { waitUntil: 'domcontentloaded' })
          await page.locator('#workspace-content h1').first().waitFor({ timeout: 60000 })
        } catch (error) {
          console.log(JSON.stringify({ theme, route, url: page.url(), errors, body: (await page.locator('body').innerText()).slice(0, 3500) }))
          if (screenshots) await page.screenshot({ path: path.join(screenshots, `failure-${route.replaceAll('/', '-')}-${theme}.png`) })
          throw error
        }
        await page.waitForTimeout(500)
        const result = { theme, route, ...await layout(page), errors: errors.splice(0) }
        findings.push(result)
        console.log(inspectOnly ? JSON.stringify(result) : `Passed ${theme} ${route}`)
        if (screenshots) await page.screenshot({ path: path.join(screenshots, `${role}-${route.replaceAll('/', '-')}-${theme}.png`) })
        if (!inspectOnly) {
          if (route === 'officer/metrics') {
            const downloaded = page.waitForEvent('download', { timeout: 60000 })
            await page.getByRole('button', { name: 'Download PDF', exact: true }).click()
            try { assert.match((await downloaded).suggestedFilename(), /\.pdf$/) }
            catch (error) { console.log('PDF failure', (await page.locator('body').innerText()).slice(-1000)); throw error }
          }
          assert.equal(result.overflowX, false, `${route} ${theme}: horizontal overflow`)
          assert.equal(result.titles, 1, `${route} ${theme}: one page title`)
          assert.equal(result.fontSize, '28px', `${route} ${theme}: consistent desktop heading`)
          assert.deepEqual(result.errors, [], `${route} ${theme}: runtime errors`)
          if (fitted.has(route)) assert.equal(result.overflowY, false, `${route} ${theme}: fitted desktop workspace`)
        }
        if (route === 'admin/users') {
          const shortRows = result.rows
          await page.setViewportSize({ width: 1366, height: 1080 })
          await page.waitForTimeout(300)
          const tallRows = await page.locator('tbody tr').count()
          if (!inspectOnly) assert.ok(tallRows > shortRows, 'A taller user table displays more rows')
          await page.getByRole('tab', { name: 'Create user', exact: true }).click()
          await page.getByLabel('Full name', { exact: true }).fill('Draft staff name')
          await page.getByRole('tab', { name: 'Users', exact: true }).click()
          await page.getByRole('tab', { name: 'Users', exact: true }).focus()
          await page.keyboard.press('ArrowRight')
          if (!inspectOnly) assert.equal(await page.getByLabel('Full name', { exact: true }).inputValue(), 'Draft staff name')
          await page.setViewportSize({ width: 1366, height: 768 })
        }
        if (!inspectOnly) {
          const tabs = page.getByRole('tab')
          for (let i = 0; i < await tabs.count(); i++) {
            const tab = tabs.nth(i)
            await tab.click()
            const panel = page.locator(`[id="${await tab.getAttribute('aria-controls')}"]`)
            await panel.waitFor({ state: 'visible' })
            assert.equal(await tab.getAttribute('aria-selected'), 'true')
            assert.equal(await tab.evaluate(element => getComputedStyle(element).borderRadius), '12px', `${route}: shared tab shape`)
          }
          if (await tabs.count()) await tabs.first().click()
          if (fitted.has(route)) for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 320, height: 844 }]) {
            await page.setViewportSize(viewport)
            await page.waitForTimeout(120)
            const size = await layout(page)
            assert.equal(size.overflowX, false, `${route} ${theme} ${viewport.width}: horizontal overflow`)
            if (viewport.width >= 1024) {
              assert.equal(size.overflowY, false, `${route} ${theme} ${viewport.width}: desktop fit`)
              for (const pagination of await page.getByRole('navigation', { name: 'Results pages' }).all()) {
                const bounds = await pagination.boundingBox()
                assert.ok(bounds.y + bounds.height <= viewport.height + 1, `${route}: pagination remains visible`)
              }
            }
            assert.equal(size.fontSize, viewport.width < 768 ? '24px' : '28px')
            if (screenshots && viewport.width === 320) await page.screenshot({ path: path.join(screenshots, `${role}-${route.replaceAll('/', '-')}-${theme}-mobile.png`) })
          }
          if (!fitted.has(route)) for (const width of [768, 320]) {
            await page.setViewportSize({ width, height: 844 })
            assert.equal((await layout(page)).overflowX, false, `${route} ${theme} ${width}: detail overflow`)
          }
          await page.setViewportSize({ width: 1366, height: 768 })
          if (!fitted.has(route)) for (const viewport of [{ width: 1366, height: 768 }, { width: 320, height: 844 }]) {
            await page.setViewportSize(viewport)
            const main = page.locator('#workspace-content')
            await main.evaluate(element => { element.scrollTop = 0 })
            const header = main.locator('header').first()
            const initial = await header.boundingBox()
            await main.evaluate(element => { element.scrollTop = Math.min(400, element.scrollHeight - element.clientHeight) })
            await page.waitForTimeout(150)
            const scrolled = await header.boundingBox()
            assert.ok(Math.abs(scrolled.y - initial.y) <= 1, `${route} ${theme}: sticky header keeps its initial top spacing at ${viewport.width}px`)
            if (screenshots) await page.screenshot({ path: path.join(screenshots, `sticky-${route.replaceAll('/', '-')}-${theme}-${viewport.width}.png`) })
            await main.evaluate(element => { element.scrollTop = 0 })
          }
          await page.setViewportSize({ width: 1366, height: 768 })
          assert.deepEqual(errors.splice(0), [], `${route}: tab and viewport changes`)
          if (route === 'officer/reports') {
            const open = page.getByRole('button', { name: 'Open Reported waste near residential block 1 details', exact: true })
            await open.hover()
            assert.equal(await open.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'Row action does not cover its title on hover')
            await open.focus()
            await page.keyboard.press('Enter')
            await page.waitForURL('**/dashboard/raw-data/report-0')
            await page.getByRole('heading', { name: 'Report Details', exact: true }).waitFor()
          }
        }
      }
      await context.close()
    }
  } finally {
    if (screenshots) fs.writeFileSync(path.join(screenshots, 'role-layout-findings.json'), JSON.stringify(findings, null, 2))
    await browser.close()
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
