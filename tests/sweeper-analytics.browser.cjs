const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const baseUrl = process.env.ECOPIN_TEST_URL || 'http://localhost:4001'
const screenshotDir = process.env.ECOPIN_SCREENSHOT_DIR
const metrics = {
  slaCompliance: { rate: 75, totalReports: 8, breachedReports: 2 },
  outlierMetrics: { currentFlagged: 3, averageAge: 40.5, totalResolved: 2, averageResolutionTime: 6 },
  sweeperTasks: { totalCreated: 4, totalCompleted: 3, averageRouteTime: 21, averageClustersPerTask: 1.5 },
}
async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ acceptDownloads: true, timezoneId: 'Asia/Manila' })
      let mode = 'failed', exportFailed = true
      const requests = [], exports = [], errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, theme)
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname.endsWith('/sweeper/analytics/metrics')) {
          requests.push(url)
          return route.fulfill({ status: mode === 'failed' ? 503 : mode === 'forbidden' ? 403 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'failed' || mode === 'forbidden' ? { error: 'Synthetic unavailable' } : mode === 'empty' ? {
            slaCompliance: { rate: 100, totalReports: 0, breachedReports: 0 },
            outlierMetrics: { currentFlagged: 0, averageAge: 0, totalResolved: 0, averageResolutionTime: 0 },
            sweeperTasks: { totalCreated: 0, totalCompleted: 0, averageRouteTime: 0, averageClustersPerTask: 0 },
          } : metrics) })
        }
        if (url.pathname.endsWith('/sweeper/analytics/export')) {
          exports.push(url)
          return route.fulfill({ status: exportFailed ? 503 : 200, contentType: 'text/csv', body: 'task_id,creation_timestamp\nsynthetic-task,2026-10-14\n' })
        }
        const body = url.pathname.endsWith('/auth/me') ? { user: { id: 'test-officer', role: 'officer', full_name: 'SWMO Test Officer' } }
          : url.pathname.includes('validate-session') ? { valid: true }
          : url.pathname.includes('settings') ? { session_timeout_minutes: 60 }
          : url.pathname.includes('clusters') ? [] : {}
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }))
      await page.setViewportSize({ width: 320, height: 900 })
      await page.goto(`${baseUrl}/dashboard/officer/sweeper-analytics`)
      await page.getByRole('heading', { name: 'Analytics could not load' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Download CSV' }).isDisabled(), true)
      assert.equal(await page.locator('canvas').count(), 0)
      mode = 'loaded'
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByRole('heading', { name: 'Current report snapshot' }).waitFor()
      assert.match(await page.locator('main').innerText(), /75%/)
      assert.match(await page.locator('main').innerText(), /6 of 8 applicable/)
      await page.getByRole('button', { name: 'Download CSV' }).click()
      await page.getByText('The CSV could not download. Please try again.').waitFor()
      exportFailed = false
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `sweeper-${theme}-${width}.png`), fullPage: true })
      }
      await page.getByLabel('From date').fill('2026-10-01')
      await page.getByLabel('To date').fill('2026-10-14')
      assert.equal(await page.getByRole('button', { name: 'Download CSV' }).isDisabled(), true)
      await page.getByRole('button', { name: 'Apply dates' }).click()
      await page.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('Download CSV'))
      await page.getByRole('button', { name: 'Download CSV' }).waitFor({ state: 'visible' })
      const download = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download CSV' }).click()
      await download
      await page.getByText('CSV download started. Check your browser downloads.').waitFor()
      const request = requests.at(-1)
      assert.equal(request.searchParams.get('startDate'), '2026-09-30T16:00:00.000Z')
      assert.equal(request.searchParams.get('endDate'), '2026-10-14T15:59:59.999Z')
      assert.equal(exports.at(-1).search, request.search)
      assert.equal(request.searchParams.has('region'), false)
      assert.equal(await page.locator('a[download]').count(), 0)
      const requestCount = requests.length
      await page.getByLabel('From date').fill('')
      await page.getByRole('button', { name: 'Apply dates' }).click()
      await page.getByText('Choose both dates.', { exact: true }).waitFor()
      assert.equal(requests.length, requestCount)
      mode = 'failed'
      await page.getByRole('button', { name: 'Refresh', exact: true }).click()
      await page.getByRole('heading', { name: 'Analytics could not load' }).waitFor()
      assert.match(await page.locator('main').innerText(), /75%/)
      assert.equal(await page.getByRole('button', { name: 'Download CSV' }).isDisabled(), true)
      mode = 'empty'
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByText('No applicable reports', { exact: true }).waitFor()
      assert.equal(await page.getByText('100%', { exact: true }).count(), 0)
      mode = 'forbidden'
      await page.getByRole('button', { name: 'Refresh', exact: true }).click()
      await page.getByRole('heading', { name: 'Sweeper analytics are restricted' }).waitFor()
      assert.equal(await page.getByRole('heading', { name: 'Current report snapshot' }).count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Download CSV' }).isDisabled(), true)
      assert.equal(await page.getByRole('link', { name: 'View report analytics' }).getAttribute('href'), '/dashboard/officer/metrics')
      if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `sweeper-${theme}-restricted.png`), fullPage: true })
      await page.getByText('Current report map', { exact: true }).click()
      await page.getByText('Live report density and clusters, including reports beyond SLA.', { exact: false }).waitFor()
      await page.locator('.leaflet-container').waitFor()
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Sweeper analytics: themes/responsive, service retry, real summaries, empty/403/stale states, local date bounds, and CSV feedback passed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
