const assert = require('node:assert/strict')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    const context = await browser.newContext()
    await fixtures(context, 'admin')
    let depot = { name: 'Original depot', latitude: 14.561433, longitude: 121.075636 }
    const writes = []
    let failSave = false
    await context.route('**/api/optimization/settings', route => {
      if (route.request().method() === 'PUT') {
        const data = route.request().postDataJSON()
        writes.push(data)
        if (failSave) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic depot save failure' }) })
        depot = data.value
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ key: data.key, value: depot }) })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ key: 'swmo_depot', value: depot }]) })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/dashboard/admin/optimization-settings`, { waitUntil: 'domcontentloaded' })
    const name = page.getByLabel('Depot name', { exact: true })
    await name.waitFor()
    assert.equal(await name.isEnabled(), true, 'Depot name must be directly editable')
    await name.fill('  New Pasig depot  ')
    const save = page.getByRole('button', { name: 'Save depot settings', exact: true })
    await save.waitFor()
    await page.getByRole('tab', { name: 'Field Crew Configuration', exact: true }).click()
    await page.getByRole('tab', { name: 'SWMO Depot Location', exact: true }).click()
    assert.equal(await name.inputValue(), '  New Pasig depot  ')
    await save.click()
    await page.getByText('Depot settings saved successfully', { exact: true }).waitFor()
    assert.deepEqual(writes[0], { key: 'swmo_depot', value: { name: 'New Pasig depot', latitude: 14.561433, longitude: 121.075636 } })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await name.waitFor()
    assert.equal(await name.inputValue(), 'New Pasig depot')
    await name.fill('   ')
    await save.click()
    await page.getByText('Depot name is required', { exact: true }).waitFor()
    assert.equal(writes.length, 1, 'Blank names must not be saved')
    await name.fill('Unsaved depot')
    failSave = true
    await save.click()
    await page.getByText('Synthetic depot save failure', { exact: true }).waitFor()
    assert.equal(await name.inputValue(), 'Unsaved depot')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await name.waitFor()
    assert.equal(await name.inputValue(), 'New Pasig depot')
    assert.deepEqual(errors, [])
    console.log('Passed: depot name editing, combined save, reload, tab persistence, validation, failure recovery and cancellation')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
