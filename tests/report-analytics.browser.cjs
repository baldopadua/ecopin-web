const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const baseUrl = process.env.ECOPIN_TEST_URL || 'http://localhost:4001'
async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ acceptDownloads: true })
      const errors = []
      let mode = 'failed', ratingsFailed = true
      const rows = Array.from({ length: 6 }, (_, i) => ({ id: `synthetic-${i}`, title: `Synthetic report ${i}`, issue_type: i % 2 ? 'waste' : 'flooding', status: ['unresolved', 'in_progress', 'waiting_for_feedback', 'resolved', 'closed', 'pending_owner_consent'][i], validation_status: 'approved', created_at: '2026-10-10T00:00:00Z', updated_at: '2026-10-12T00:00:00Z' }))
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, theme)
      await page.route('**/api/**', route => {
        const url = route.request().url()
        const body = url.endsWith('/auth/me') ? { user: { id: 'test-officer', role: 'officer', full_name: 'SWMO Test Officer' } }
          : url.includes('validate-session') ? { valid: true } : url.includes('settings') ? { session_timeout_minutes: 60 }
          : url.includes('/analytics/satisfaction') ? { total: 5, average: 3, distribution: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } } : {}
        return route.fulfill({ status: url.includes('/analytics/satisfaction') && ratingsFailed ? 503 : 200, contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/public_reports*', route => route.fulfill({ status: mode === 'failed' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'failed' ? { message: 'Synthetic report service unavailable' } : mode === 'empty' ? [] : rows) }))
      await page.goto(`${baseUrl}/dashboard/officer/metrics`)
      await page.getByRole('heading', { name: 'Report analytics could not load' }).waitFor({ timeout: 20000 })
      assert.equal(await page.getByRole('button', { name: 'Download PDF' }).isDisabled(), true)
      mode = 'loaded'
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByRole('heading', { name: 'How are reports progressing?' }).waitFor()
      await page.getByText('Ratings could not load.', { exact: true }).waitFor()
      assert.match(await page.locator('main').innerText(), /2 of 6 reports/)
      assert.equal(await page.locator('canvas').count(), 4)
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `report-analytics-${theme}-${width}.png`) })
      }
      ratingsFailed = false
      await page.getByRole('button', { name: 'Retry ratings' }).click()
      await page.getByText('Average rating: 3 of 5 from 5 responses.', { exact: true }).waitFor()
      assert.equal(await page.locator('canvas').count(), 5)
      for (const canvas of await page.locator('canvas').all()) assert.ok(await canvas.getAttribute('aria-label'))
      if (process.env.ECOPIN_SCREENSHOT_DIR) {
        await page.getByRole('heading', { name: 'When were reports created?' }).scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `report-charts-${theme}-1440.png`) })
        await page.getByRole('heading', { name: 'Resident ratings', exact: true }).scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `report-ratings-${theme}-1440.png`) })
      }
      const download = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download PDF' }).click()
      const pdf = await download
      assert.match(pdf.suggestedFilename(), /\.pdf$/)
      if (process.env.ECOPIN_SCREENSHOT_DIR) await pdf.saveAs(path.join(process.env.ECOPIN_SCREENSHOT_DIR, `report-analytics-${theme}.pdf`))
      await page.getByText('PDF download started. Check your browser downloads.').waitFor()
      mode = 'failed'
      await page.getByRole('button', { name: 'Refresh analytics' }).click()
      await page.getByText('The last loaded reports remain below.', { exact: false }).waitFor()
      assert.match(await page.locator('main').innerText(), /2 of 6 reports/)
      mode = 'empty'
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByRole('heading', { name: 'No public reports to summarize' }).waitFor()
      assert.equal(await page.getByText('0% of all reports resolved', { exact: true }).count(), 0)
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Report analytics: responsive themes, retry, accessible chart summaries, independent ratings, PDF download, stale data, and empty states passed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
