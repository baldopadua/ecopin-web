const assert = require('node:assert/strict')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await fixtures(context, 'officer')
    let failCrews = false
    await context.route('**/api/optimization/crews', route => route.fulfill({ status: failCrews ? 503 : 200, contentType: 'application/json', body: JSON.stringify(failCrews ? { message: 'Synthetic unavailable crews' } : [{ id: 'crew-a', name: 'Crew A' }, { id: 'crew-b', name: 'Crew B' }]) }))
    await context.route('**/api/cleanup-tasks?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'task-1', title: 'Assigned team', assigned_field_crew_id: 'crew-a', assigned_crew_ids: ['person-1', 'person-2'], status: 'pending' },
      { id: 'task-2', title: 'Team without member snapshot', assigned_field_crew_id: 'crew-b', assigned_crew_ids: [], status: 'pending' },
      { id: 'task-3', title: 'Legacy team IDs', assigned_crew_ids: ['crew-a', 'crew-b', 'crew-a'], status: 'pending' },
      { id: 'task-4', title: 'No assignment', assigned_crew_ids: [], status: 'pending' },
      { id: 'task-5', title: 'Unavailable team', assigned_field_crew_id: 'deleted-crew', assigned_crew_ids: ['person-1'], status: 'pending' },
      { id: 'task-6', title: 'Legacy staff assignment', assigned_crew_ids: ['person-1'], status: 'pending' },
    ]) }))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/dashboard/officer/operations`, { waitUntil: 'domcontentloaded' })
    const crewCell = title => page.getByRole('row').filter({ has: page.getByRole('cell', { name: title, exact: true }) }).getByRole('cell').nth(2)
    await page.getByRole('cell', { name: 'Assigned team', exact: true }).waitFor()
    assert.equal(await crewCell('Assigned team').innerText(), 'Crew A')
    assert.equal(await crewCell('Team without member snapshot').innerText(), 'Crew B')
    assert.equal(await crewCell('Legacy team IDs').innerText(), 'Crew A, Crew B')
    assert.equal(await crewCell('No assignment').innerText(), 'Unassigned')
    assert.equal(await crewCell('Unavailable team').innerText(), 'Crew name unavailable')
    assert.equal(await crewCell('Legacy staff assignment').innerText(), 'Crew name unavailable')
    failCrews = true
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('cell', { name: 'Assigned team', exact: true }).waitFor()
    assert.equal(await crewCell('Assigned team').innerText(), 'Crew name unavailable')
    assert.equal(await crewCell('No assignment').innerText(), 'Unassigned')
    assert.deepEqual(errors, [])
    console.log('Passed: Operations crew names, legacy teams, unassigned rows and unavailable crew lookup')
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
