const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const stamp = Date.now()
const iso = hours => new Date(stamp + hours * 3600000).toISOString()
const reports = [
  { id: '00000000-0000-0000-0000-000000000001', title: 'Approaching concern', status: 'in_progress', sla_started_at: iso(-23), deadline_at: iso(1) },
  { id: '00000000-0000-0000-0000-000000000002', title: 'Overdue concern', status: 'unresolved', sla_started_at: iso(-26), deadline_at: iso(-2) },
  { id: '00000000-0000-0000-0000-000000000003', title: 'Scheduled concern', status: 'unresolved', sla_started_at: iso(0), deadline_at: iso(24) },
  { id: '00000000-0000-0000-0000-000000000004', title: 'Resolved concern', status: 'resolved', sla_started_at: iso(-26), deadline_at: iso(-2) },
].map((r, i) => ({ ...r, validation_status: 'approved', location_precision: 'approximate',
  latitude: 14.5802 + i * .001, longitude: 121.085 + i * .001,
  created_at: iso(-23), updated_at: iso(0), issue_type: 'waste', description: 'Synthetic public concern for deadline verification.' }))

;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    const context = await browser.newContext()
    const publicRequests = []
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      const pathname = url.pathname.replace(/^\/api\/backend/, '')
      const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      if (pathname.endsWith('/api/session')) return json({ state: 'none' })
      if (pathname.endsWith('/public_reports')) {
        publicRequests.push(url)
        const id = url.searchParams.get('id')?.replace(/^eq\./, '')
        return json(id ? reports.filter(report => report.id === id) : reports)
      }
      if (/\/api\/reports\/[^/]+$/.test(pathname)) return json(reports.find(report => pathname.endsWith(report.id)) || reports[0])
      if (pathname.endsWith('/batch-evidence') || pathname.endsWith('/batch-publishers')) return json({})
      if (/\/evidence$|\/clusters$/.test(pathname)) return json([])
      if (url.hostname.includes('tile.openstreetmap') || url.hostname.includes('basemaps.cartocdn')) return route.abort()
      if (url.origin !== new URL(base).origin) return route.abort()
      return route.continue()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/explore?view=gallery`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-response-deadline="at_risk"]').first().waitFor()
    assert.equal(await page.locator('[data-response-deadline="overdue"]').count(), 1)
    assert.equal(await page.locator('[data-response-deadline="scheduled"]').count(), 1)
    assert.equal(await page.locator('[data-response-deadline]').count(), 3, 'Resolved reports must not show a running deadline')
    assert.ok(publicRequests.length > 0)
    for (const url of publicRequests) {
      assert.ok(url.searchParams.get('select').includes('deadline_at'))
      assert.equal(url.searchParams.get('select').includes('user_id'), false)
    }
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const indicator of await page.locator('[data-response-deadline]').all()) {
        assert.ok(await indicator.evaluate(node => node.scrollWidth <= node.clientWidth + 1), `Deadline text overflows at ${width}px`)
      }
      if (process.env.ECOPIN_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.ECOPIN_SCREENSHOT_DIR, { recursive: true })
        await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `public-deadlines-${width}.png`), fullPage: true })
      }
    }
    await page.getByRole('button', { name: 'Approaching concern', exact: true }).click()
    await page.getByText('Target response:', { exact: false }).first().waitFor()
    await page.goto(`${base}/explore`, { waitUntil: 'domcontentloaded' })
    await page.locator('.leaflet-marker-icon').first().waitFor()
    await page.locator('.leaflet-marker-icon').first().click()
    await page.locator('.leaflet-popup [data-response-deadline]').waitFor()
    await page.goto(`${base}/reports/${reports[0].id}`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Response deadline approaching', { exact: true }).waitFor()
    assert.match(page.url(), /\/reports\//)
    await page.getByText('Target response:', { exact: false }).waitFor()
    assert.deepEqual(errors, [])
    console.log('Passed: signed-out Explore gallery, report details, privacy-safe fields and deadline wrapping at 320/768/1024/1440px')
    await context.close()
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
