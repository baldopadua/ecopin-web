const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const baseUrl = process.env.ECOPIN_TEST_URL || 'http://localhost:4001'

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const width of [320, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 700 } })
      const errors = []
      let failGallery = true
      const photos = ['street-cleanup.jpg', 'neighborhood-team.jpg'].map((file, i) => ({ url: `${baseUrl}/images/community/${file}`, name: `Evidence ${i + 1}`, resource_type: 'image' }))
      const report = { id: 'media-report', cluster_id: 'media-cluster', title: 'Waste beside a neighborhood street', description: 'A long description of a cleanup concern for the staff viewer.', issue_type: 'waste', validation_status: 'approved', status: 'unresolved', image_url: photos[0].url, created_at: '2026-10-12T12:00:00Z' }
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(width => {
        localStorage.setItem('theme', width === 320 ? 'light' : 'dark')
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, width)
      await page.route('**/api/**', route => {
        const url = route.request().url()
        if (url.endsWith('/batch-evidence')) return route.fulfill({ status: failGallery ? 500 : 200, contentType: 'application/json', body: JSON.stringify(failGallery ? { error: 'unavailable' } : { 'media-report': photos }) })
        const body = url.endsWith('/auth/me') ? { user: { role: 'officer', full_name: 'Test Officer' } }
          : url.includes('/clusters/') ? { id: 'media-cluster', label: 'Neighborhood cleanup', priority: 'medium', priority_score: 45, report_count: 1, status: 'active' }
          : url.endsWith('/cleanup-tasks') ? []
          : url.endsWith('/evidence') ? photos
          : { valid: true, session_timeout_minutes: 60 }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([report]) }))
      await page.goto(`${baseUrl}/dashboard/officer/hotzone-intel/media-cluster`)
      await page.getByRole('alert').filter({ hasText: 'Evidence could not load' }).waitFor()
      failGallery = false
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByRole('button', { name: 'Open evidence photo 1 for Waste beside a neighborhood street', exact: true }).waitFor()
      const opener = page.getByRole('button', { name: 'Open Waste beside a neighborhood street', exact: true })
      await opener.focus()
      await page.keyboard.press('Enter')
      const details = page.getByRole('dialog', { name: report.title, exact: true })
      await details.waitFor()
      await details.getByRole('button', { name: 'Expand photo', exact: true }).click()
      const viewer = page.getByRole('dialog', { name: 'Evidence photos', exact: true })
      await viewer.waitFor()
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab')
        assert.equal(await viewer.evaluate(el => el.contains(document.activeElement)), true)
      }
      await page.keyboard.press('ArrowRight')
      await viewer.getByRole('status').filter({ hasText: '(2 / 2)' }).waitFor()
      await page.keyboard.press('ArrowLeft')
      await viewer.getByRole('status').filter({ hasText: '(1 / 2)' }).waitFor()
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `staff-media-${width}.png`) })
      await page.keyboard.press('Escape')
      await viewer.waitFor({ state: 'hidden' })
      assert.equal(await details.getByRole('button', { name: 'Expand photo', exact: true }).evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('Escape')
      await details.waitFor({ state: 'hidden' })
      assert.equal(await opener.evaluate(el => el === document.activeElement), true)
      const photoOpener = page.getByRole('button', { name: 'Open evidence photo 1 for Waste beside a neighborhood street', exact: true })
      await photoOpener.focus()
      await page.keyboard.press('Enter')
      await viewer.waitFor()
      await page.keyboard.press('Escape')
      assert.equal(await photoOpener.evaluate(el => el === document.activeElement), true)
      await photoOpener.click()
      await viewer.waitFor()
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('session-expired')))
      const expired = page.getByRole('dialog', { name: 'Sign in to continue', exact: true })
      await expired.waitFor()
      const signIn = expired.getByRole('button', { name: 'Return to sign in', exact: true })
      assert.equal(await signIn.evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('Tab')
      assert.equal(await signIn.evaluate(el => el === document.activeElement), true)
      await signIn.click()
      await page.waitForURL('**/auth')
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Staff evidence failure/retry, keyboard gallery access, nested modal focus, photo navigation, and focus return passed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
