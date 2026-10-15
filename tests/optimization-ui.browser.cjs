const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
      const errors = [], mutations = []
      const run = { id: 'synthetic-run', status: 'approved', created_at: '2026-10-15T00:00:00Z', num_tasks_optimized: 5, num_crews: 2, weather_condition: 'normal', traffic_condition: 'low', routes: [] }
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, theme)
      await page.route('**/api/**', route => {
        const url = route.request().url()
        if (route.request().method() !== 'GET') mutations.push(url)
        const body = url.endsWith('/auth/me') ? { user: { id: 'test-officer', role: 'officer', full_name: 'SWMO Test Officer' } }
          : url.includes('validate-session') ? { valid: true }
          : url.includes('settings') ? { session_timeout_minutes: 60 }
          : url.includes('disassemble-preview') ? { can_disassemble: true, tasks_count: 5, reports_count: 8, clusters_count: 2, tasks: [] }
          : url.endsWith('/optimization/runs') ? [run]
          : url.includes('/optimization/runs/') ? run
          : url.includes('/optimization/templates') ? []
          : url.includes('/optimization/queue') ? { queue: [{ id: 'synthetic-item' }] }
          : {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
      await page.route('https://api.open-meteo.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current_weather: { weathercode: 0 } }) }))
      await page.goto(`${process.env.ECOPIN_TEST_URL || 'http://localhost:4001'}/dashboard/officer/optimization`)
      await page.getByRole('heading', { name: 'Dispatch settings' }).waitFor({ timeout: 60000 })
      await page.getByRole('button', { name: /Advanced settings/ }).click()
      await page.getByLabel('Shift break duration').selectOption('30')
      await page.getByRole('button', { name: /Walking/ }).click()
      assert.equal(await page.getByRole('button', { name: /Walking/ }).getAttribute('aria-pressed'), 'true')
      await page.getByRole('button', { name: 'Save preset', exact: true }).click()
      await page.getByLabel('Preset name').fill('Synthetic preset')
      await page.getByRole('button', { name: 'Cancel saving preset' }).click()
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme} ${width} overflow`)
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth), false, `${theme} ${width} workspace overflow`)
        const choice = page.getByRole('button', { name: /Walking/ })
        assert.equal(await choice.evaluate(el => getComputedStyle(el).borderRadius), '16px')
        assert.ok(await choice.evaluate(el => el.getBoundingClientRect().height >= 44))
        if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `optimization-${theme}-${width}.png`), fullPage: true })
      }
      const opener = page.getByRole('button', { name: 'Disassemble', exact: true })
      await opener.click()
      await page.getByRole('dialog', { name: 'Disassemble and reset plan' }).waitFor()
      await page.getByRole('button', { name: 'Disassemble and restore backlog' }).waitFor()
      await page.setViewportSize({ width: 320, height: 720 })
      await page.waitForFunction(() => {
        const box = document.querySelector('dialog[open] > div')?.getBoundingClientRect()
        return box && box.top >= 0 && box.bottom <= innerHeight
      })
      assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false)
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `optimization-modal-${theme}-320.png`) })
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(await opener.evaluate(el => el === document.activeElement), true)
      await page.getByRole('button', { name: 'View', exact: true }).click()
      await page.getByRole('heading', { name: 'Optimization details' }).waitFor()
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `detail ${theme} ${width} overflow`)
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth), false, `detail ${theme} ${width} workspace overflow`)
      }
      assert.deepEqual(errors, [])
      assert.deepEqual(mutations, [])
      await page.close()
    }
    console.log('Optimization Center: both themes, four widths, settings, selection, history, modal dismissal/focus, and detail layout passed. No API mutations.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
