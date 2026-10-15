const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
      const errors = []
      let mode = 'error', previewMode = 'blocked'
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
          : url.endsWith('/plan/generate') ? mode === 'error' ? { message: 'Synthetic service unavailable. Please try again.' } : { jobId: 'synthetic-job', status: 'queued' }
          : url.includes('/plan/jobs/') ? { status: 'completed', planId: 'synthetic-plan' }
          : url.includes('disassemble-preview') ? { can_disassemble: previewMode !== 'blocked', blocking_reason: 'A field crew has already completed a task.', is_committed: true, tasks_count: 2, reports_count: 3, clusters_count: 1, in_progress_tasks_count: 1, tasks: [] }
          : url.endsWith('/plan/synthetic-plan') ? { plan: { id: 'synthetic-plan' }, items: mode === 'success' ? [{ is_selected: true, item_type: 'cluster' }] : [], capacity: { used: 30 }, plannedCrewCount: 1, proposedRoutes: [] }
          : url.endsWith('/optimization/runs') ? [{ id: 'synthetic-run', status: 'approved', created_at: '2026-10-15T00:00:00Z', num_tasks_optimized: 2 }]
          : url.includes('/optimization/templates') ? [] : url.includes('/optimization/queue') ? { queue: [] } : {}
        return route.fulfill({ status: url.endsWith('/plan/generate') && mode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
      await page.route('https://api.open-meteo.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current_weather: { weathercode: 0 } }) }))
      await page.goto(`${process.env.ECOPIN_TEST_URL || 'http://localhost:4001'}/dashboard/officer/optimization`)
      const generate = page.getByRole('button', { name: 'Generate Route Proposal' })
      await generate.waitFor({ timeout: 60000 })
      await page.clock.install()
      await generate.click()
      const errorToast = page.getByRole('alert').filter({ hasText: 'Synthetic service unavailable' })
      await errorToast.waitFor()
      await page.clock.fastForward(7000)
      assert.equal(await errorToast.isVisible(), true, 'Errors must persist')
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        const box = await errorToast.boundingBox()
        assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0)
        assert.equal(await errorToast.evaluate(el => getComputedStyle(el).borderRadius), '16px')
        const dismiss = errorToast.getByRole('button', { name: 'Dismiss notification' })
        assert.ok(await dismiss.evaluate(el => el.offsetWidth >= 44 && el.offsetHeight >= 44))
        if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `feedback-error-${theme}-${width}.png`) })
      }
      await errorToast.getByRole('button', { name: 'Dismiss notification' }).click()
      mode = 'success'
      await generate.click()
      await page.getByText('Optimization in progress', { exact: true }).waitFor()
      assert.equal(await page.getByRole('progressbar', { name: 'Optimization progress' }).getAttribute('value'), '20')
      await page.clock.fastForward(2100)
      const success = page.getByRole('status').filter({ hasText: 'Draft plan generated with 1 tasks.' })
      await success.waitFor()
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `feedback-success-${theme}.png`) })
      await page.mouse.move(0, 0)
      await page.clock.fastForward(6100)
      await success.waitFor({ state: 'hidden' })
      mode = 'warning'
      await generate.click()
      await page.getByText('Optimization in progress', { exact: true }).waitFor()
      await page.clock.fastForward(2100)
      const warning = page.getByRole('status').filter({ hasText: 'Draft plan generated with 0 tasks.' })
      await warning.waitFor()
      await page.clock.fastForward(7000)
      assert.equal(await warning.isVisible(), true, 'Warnings must persist')
      await warning.getByRole('button', { name: 'Dismiss notification' }).click()
      await page.getByRole('button', { name: 'Disassemble', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Disassemble and reset plan' })
      await dialog.getByText('Disassembly unavailable', { exact: true }).waitFor()
      assert.equal(await dialog.getByRole('button', { name: 'Disassemble and restore backlog' }).isDisabled(), true)
      assert.equal(await dialog.getByRole('button', { name: 'Cancel', exact: true }).evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('Escape')
      previewMode = 'allowed'
      await page.getByRole('button', { name: 'Disassemble', exact: true }).click()
      await dialog.getByText(/currently marked in progress/).waitFor()
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 720 })
        const bounds = await dialog.locator(':scope > div').boundingBox()
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= 721)
        const actionBox = await dialog.getByRole('button', { name: 'Disassemble and restore backlog' }).boundingBox()
        assert.ok(actionBox.y >= 0 && actionBox.y + actionBox.height <= 721)
        if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `feedback-modal-${theme}-${width}.png`) })
      }
      await page.keyboard.press('Escape')
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Feedback: error/warning persistence, success expiry, progress semantics, modal safety/focus, both themes and four widths passed. All API requests intercepted.')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
