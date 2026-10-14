const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const baseUrl = process.env.ECOPIN_TEST_URL || 'http://localhost:4001'
const screenshotDir = process.env.ECOPIN_SCREENSHOT_DIR

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  const reports = Array.from({ length: 12 }, (_, i) => ({ id: `report-${i}`, title: `Street cleanup concern ${i + 1}`, description: 'Waste near a residential street.', issue_type: 'waste', status: i % 2 ? 'resolved' : 'unresolved', validation_status: 'approved', created_at: '2026-10-12T12:00:00Z' }))
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, theme)
      await page.route('**/api/**', route => {
        const url = route.request().url()
        const body = url.endsWith('/auth/me') ? { user: { id: 'test-officer', role: 'officer', full_name: 'SWMO Test Officer' } }
          : url.includes('validate-session') ? { valid: true }
          : url.includes('settings') ? { session_timeout_minutes: 60 }
          : {}
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(reports) }))
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${baseUrl}/dashboard/officer/reports`)
        await page.getByRole('heading', { name: 'Reports Directory' }).waitFor()
        await page.getByRole('button', { name: 'Open Street cleanup concern 1', exact: true }).waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No document overflow at ${width} ${theme}`)
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth), false, `No workspace overflow at ${width} ${theme}`)
        const filter = page.getByRole('combobox', { name: 'Status', exact: true })
        await filter.focus()
        await page.keyboard.press('Enter')
        await page.keyboard.press('End')
        await page.keyboard.press('Escape')
        assert.equal(await filter.getAttribute('aria-expanded'), 'false')
        assert.equal(await filter.evaluate(el => el === document.activeElement), true)
        await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('concern 1')
        await page.getByRole('status').filter({ hasText: '4 items found' }).waitFor()
        await page.getByRole('button', { name: 'Reset Filters' }).click()
        if (width < 1024) {
          await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
          const dialog = page.getByRole('dialog', { name: 'Workspace navigation' })
          await dialog.waitFor()
          assert.equal(await dialog.getByRole('link', { name: 'Reports', exact: true }).getAttribute('aria-current'), 'page')
          await page.keyboard.press('Escape')
          await dialog.waitFor({ state: 'hidden' })
          assert.equal(await page.getByRole('button', { name: 'Open navigation', exact: true }).evaluate(el => el === document.activeElement), true)
        } else {
          await page.getByRole('button', { name: 'Collapse navigation' }).click()
          await page.getByRole('link', { name: 'Reports', exact: true }).focus()
          await page.getByRole('button', { name: 'Expand navigation' }).click()
        }
        if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `dashboard-foundation-${theme}-${width}.png`) })
      }
      await page.getByRole('button', { name: 'Open Street cleanup concern 1', exact: true }).focus()
      await page.keyboard.press('Enter')
      await page.waitForURL('**/dashboard/raw-data/report-0')
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Dashboard navigation, keyboard report opening, filters, search, and responsive themes passed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
