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
      const crews = Array.from({ length: 8 }, (_, i) => ({ id: `crew-${i}`, name: `Existing crew ${i + 1}`, shift_start: '08:00', shift_end: '17:00', max_tasks_per_shift: 10, vehicle_type: 'pickup', supports_standard: true, supports_sweeper: false }))
      const writes = []
      let fail = true
      await context.route('**/api/optimization/crews', route => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON()
          writes.push(body)
          return route.fulfill({ status: fail ? 400 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { message: 'Synthetic crew creation failure' } : { id: 'new-crew', ...body }) })
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(crews) })
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/admin/optimization-settings`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: 'Field Crew Configuration', exact: true }).click()
      await page.getByRole('heading', { name: 'Existing crew 8', exact: true }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: '+ Add crew', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Create field crew', exact: true })
      await dialog.waitFor()
      const name = dialog.getByRole('textbox', { name: /Crew name/ })
      assert.equal(await name.evaluate(element => document.activeElement === element), true)
      assert.equal(await dialog.getByLabel('Shift start', { exact: false }).inputValue(), '08:00')
      assert.equal(await dialog.getByLabel('Shift end', { exact: false }).inputValue(), '17:00')
      assert.equal(await dialog.getByLabel('Max tasks per shift', { exact: false }).inputValue(), '10')
      assert.equal(await dialog.getByLabel('Travel speed factor', { exact: false }).inputValue(), '1')
      assert.equal(await dialog.getByLabel('Service time factor', { exact: false }).inputValue(), '1')
      assert.equal(await dialog.getByLabel('Crew vehicle type', { exact: false }).inputValue(), 'compactor')
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      assert.equal(writes.length, 0, 'Blank crew names must not submit')
      await name.fill('  New crew  ')
      await dialog.getByRole('checkbox', { name: 'Standard clusters', exact: true }).uncheck()
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      await dialog.getByRole('alert').filter({ hasText: /at least one dispatch capability/i }).waitFor()
      assert.equal(writes.length, 0)
      await dialog.getByRole('checkbox', { name: 'Sweeper reports', exact: true }).check()
      await dialog.getByLabel('Travel speed factor', { exact: false }).fill('')
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      assert.equal(writes.length, 0, 'Cleared performance values must not become zero or defaults')
      await dialog.getByLabel('Travel speed factor', { exact: false }).fill('1')
      await dialog.getByLabel('Measured starting volume (m³)', { exact: false }).fill('1')
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      await dialog.getByRole('alert').filter({ hasText: /measured/i }).waitFor()
      assert.equal(writes.length, 0)
      await dialog.getByLabel('Measured starting volume (m³)', { exact: false }).fill('')
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      await dialog.getByRole('alert').filter({ hasText: 'Synthetic crew creation failure' }).waitFor()
      assert.equal(await name.inputValue(), '  New crew  ')
      fail = false
      await dialog.getByRole('button', { name: 'Create crew', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      assert.equal(writes.at(-1).name, 'New crew')
      assert.equal(writes.at(-1).supports_standard, false)
      assert.equal(writes.at(-1).supports_sweeper, true)
      assert.equal(writes.at(-1).hazmat_certified, false)

      await page.getByRole('button', { name: '+ Add crew', exact: true }).click()
      await name.fill('Retained draft')
      for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 320, height: 844 }]) {
        await page.setViewportSize(viewport)
        assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth + 1), false)
        const submit = await dialog.getByRole('button', { name: 'Create crew', exact: true }).boundingBox()
        assert.ok(submit && submit.y >= 0 && submit.y + submit.height <= viewport.height, 'Create action stays visible')
        if (process.env.ECOPIN_SCREENSHOT_DIR && [1366, 320].includes(viewport.width)) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `crew-create-${theme}-${viewport.width}.png`) })
      }
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: '+ Add crew', exact: true }).click()
      assert.equal(await name.inputValue(), 'Retained draft')
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`Passed ${theme}: crew dialog from scrolled list, defaults, validation, partial capabilities, save failure, draft and responsive layouts`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
