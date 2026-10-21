const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')

const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(context, 'admin')
      const writes = []
      let reads = 0
      let failSave = true
      await context.route('**/api/admin/settings', route => {
        if (route.request().method() === 'PATCH') {
          writes.push(route.request().postDataJSON())
          return route.fulfill({ status: failSave ? 503 : 200, contentType: 'application/json', body: JSON.stringify(failSave ? { message: 'Synthetic save failure' } : { success: true }) })
        }
        reads++
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ password_min_length: 12, daily_report_quota: 15, report_video_max_seconds: 8, cms: { contact_support_email: 'support@example.test' } }) })
      })
      const page = await context.newPage()
      page.setDefaultTimeout(30000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/admin/settings`, { waitUntil: 'domcontentloaded' })
      const save = page.getByRole('button', { name: 'Save changes', exact: true })
      await save.waitFor()
      assert.equal(await page.getByRole('button', { name: /^Save/ }).count(), 1)
      assert.equal(await page.locator('header').filter({ has: save }).count(), 1)
      assert.equal(await page.getByRole('tab').count(), 4)

      const contact = page.getByRole('tab', { name: /Contact/ })
      const media = page.getByRole('tab', { name: /Media/ })
      const announcements = page.getByRole('tab', { name: /Advisories/ })
      const security = page.getByRole('tab', { name: /Security/ })
      const panel = page.getByRole('tabpanel')
      await panel.locator('input[type=email]').first().fill('draft@example.test')
      await media.click()
      await panel.locator('input[type=text]').first().fill('Draft community headline')
      await announcements.click()
      await panel.locator('input[placeholder="v1.2.0"]').fill('v2.5.0')
      await security.click()
      assert.equal(await page.getByLabel('Maximum video duration (seconds)').inputValue(), '8')
      await page.getByLabel('Maximum video duration (seconds)').fill('7')
      await panel.locator('input[type=number]').first().fill('16')
      await panel.locator('input[type=number]').last().fill('25')
      await contact.click()
      assert.equal(await panel.locator('input[type=email]').first().inputValue(), 'draft@example.test')
      assert.equal(writes.length, 0, 'Switching tabs must never save')
      const readsAfterLoad = reads
      await contact.focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await media.getAttribute('aria-selected'), 'true')
      assert.equal(await panel.locator('input[type=text]').first().inputValue(), 'Draft community headline')
      assert.equal(reads, readsAfterLoad, 'Tab changes must not reload settings')

      await save.click()
      await page.getByText('Synthetic save failure', { exact: true }).waitFor()
      assert.equal(await panel.locator('input[type=text]').first().inputValue(), 'Draft community headline')
      await security.click()
      assert.equal(await panel.locator('input[type=number]').last().inputValue(), '25')
      failSave = false
      await save.click()
      await page.getByText('All configuration settings updated successfully', { exact: true }).waitFor()
      assert.equal(writes.length, 2)
      assert.deepEqual(writes[0], writes[1], 'A failed save must preserve the complete draft')
      assert.equal(writes[1].password_min_length, 16)
      assert.equal(writes[1].daily_report_quota, 25)
      assert.equal(writes[1].report_video_max_seconds, 7)
      assert.equal(writes[1].cms.contact_support_email, 'draft@example.test')
      assert.equal(writes[1].cms.lead_story_title, 'Draft community headline')
      assert.equal(writes[1].cms.app_version_name, 'v2.5.0')

      for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 320, height: 844 }]) {
        await page.setViewportSize(viewport)
        for (const tab of [contact, media, announcements, security]) {
          await tab.click()
          assert.equal(await panel.count(), 1)
          assert.equal(await panel.getAttribute('aria-labelledby'), await tab.getAttribute('id'))
          const layout = await page.locator('#workspace-content').evaluate(element => ({ overflow: element.scrollWidth > element.clientWidth + 1 }))
          assert.equal(layout.overflow, false, `${theme} ${viewport.width}: horizontal overflow`)
          const button = await save.boundingBox()
          assert.ok(button && button.x >= 0 && button.x + button.width <= viewport.width, 'Header save remains within viewport')
        }
        if (process.env.ECOPIN_SCREENSHOT_DIR && [1366, 320].includes(viewport.width)) {
          await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `system-settings-${theme}-${viewport.width}.png`) })
        }
      }
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`Passed ${theme}: settings drafts, shared save, failure recovery, keyboard tabs and responsive layouts`)
    }
  } finally {
    await browser.close()
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
