const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const baseUrl = process.env.ECOPIN_TEST_URL || 'http://localhost:4001'

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: theme === 'light' ? 320 : 1440, height: 900 } })
      const errors = []
      let requests = 0
      let fail = true
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        localStorage.setItem('tempAuthToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
      }, theme)
      await page.route('**/api/**', async route => {
        const url = route.request().url()
        if (url.endsWith('/force-change-password')) {
          requests++
          await new Promise(resolve => setTimeout(resolve, 500))
          return route.fulfill({ status: fail ? 400 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error: 'This password was previously used. Please choose another.' } : { success: true }) })
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(url.endsWith('/settings') ? { password_min_length: 10, password_require_uppercase: true, password_require_lowercase: true, password_require_numbers: true, password_require_special_chars: true }
          : url.endsWith('/auth/me') ? { user: { role: 'officer', full_name: 'Test Officer' } } : { valid: true }) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }))
      await page.goto(`${baseUrl}/force-change-password`)
      await page.getByRole('heading', { name: 'Choose a new password' }).waitFor()
      await page.getByText('At least 10 characters long').waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.getByLabel('New password', { exact: true }).fill('short')
      await page.getByLabel('Confirm new password', { exact: true }).fill('short')
      await page.getByRole('button', { name: 'Update password', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'Password does not meet all requirements.' }).waitFor()
      assert.equal(requests, 0)
      await page.getByLabel('New password', { exact: true }).fill('NewPassword123!')
      await page.getByLabel('Confirm new password', { exact: true }).fill('different')
      await page.getByRole('button', { name: 'Update password', exact: true }).click()
      assert.equal(requests, 0)
      await page.getByLabel('Confirm new password', { exact: true }).fill('NewPassword123!')
      await page.getByRole('button', { name: 'Show new password' }).click()
      assert.equal(await page.getByLabel('New password', { exact: true }).getAttribute('type'), 'text')
      await page.getByRole('button', { name: 'Update password', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'previously used' }).waitFor()
      assert.equal(requests, 1)
      assert.equal(await page.getByLabel('New password', { exact: true }).inputValue(), 'NewPassword123!')
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `password-recovery-${theme}.png`) })
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 600 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Recovery layout ${width} ${theme}`)
        await page.getByRole('button', { name: 'Update password', exact: true }).scrollIntoViewIfNeeded()
        assert.equal(await page.getByRole('button', { name: 'Update password', exact: true }).isVisible(), true)
      }
      fail = false
      await page.getByRole('button', { name: 'Update password', exact: true }).click()
      await page.getByRole('button', { name: 'Updating password…' }).waitFor()
      assert.equal(await page.getByLabel('New password', { exact: true }).isDisabled(), true)
      await page.waitForURL(/\/dashboard/)
      assert.equal(requests, 2)
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Password policy, mismatch, retained input, visibility, failure/retry, submission lock, and workspace redirect passed.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
