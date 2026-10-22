const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) for (const width of [1366, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(context, 'officer')
      let submitted
      await context.route('**/api/optimization/**', route => {
        const path = new URL(route.request().url()).pathname
        if (path.endsWith('/incomplete-tasks')) return route.fulfill({ json: {
          hasPriorIncomplete: true, count: 9, cluster_ids_to_carry: ['existing-cluster'],
          tasks: [{ id: 'existing-task', title: 'Existing neighborhood cleanup', status: 'in_progress', crew_name: 'Alpha' }]
        } })
        if (path.endsWith('/plan/generate')) {
          submitted = route.request().postDataJSON()
          return route.fulfill({ json: { jobId: 'test-job', status: 'completed', planId: 'test-plan' } })
        }
        if (path.endsWith('/plan/test-plan')) return route.fulfill({ json: {
          plan: { id: 'test-plan', created_at: '2026-10-22T00:00:00Z', mode: 'mixed' },
          items: [{ id: 'new-task', item_type: 'cluster', group_key: 'cluster:new', is_selected: true }],
          plannedCrewCount: 1, groups: [], rejectedBundles: [], proposedRoutes: [],
          capacity: { used: 50, totalMinutes: 72 }
        } })
        return route.fallback()
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/officer/optimization`)
      const settings = page.locator('[class*="settingsCard_"]')
      const summary = settings.locator('summary')
      await summary.waitFor()
      assert.match(await summary.innerText(), /9 unfinished tasks/)
      await summary.focus()
      await page.keyboard.press('Enter')
      await settings.getByText('Existing neighborhood cleanup', { exact: true }).waitFor()
      assert.ok(await settings.evaluate(el => el.scrollWidth <= el.clientWidth), 'settings fit without horizontal overflow')
      await page.getByRole('button', { name: /Mixed focus/ }).click()
      if (process.env.ECOPIN_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.ECOPIN_SCREENSHOT_DIR, { recursive: true })
        await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/mixed-settings-${theme}-${width}.png`, fullPage: true })
      }
      await page.getByRole('button', { name: 'Generate Route Proposal' }).click()
      await page.waitForFunction(() => document.body.innerText.includes('Draft plan generated with 1 tasks.'))
      assert.equal(submitted.settings.mode, 'mixed')
      assert.equal(submitted.settings.cluster_ids, undefined, 'unfinished assignments do not restrict new work to already claimed clusters')
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`${theme} ${width}px: unfinished tasks inside settings, keyboard disclosure and Mixed generation passed`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
