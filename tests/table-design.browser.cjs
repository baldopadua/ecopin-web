const test = require('node:test')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

test('WT-83: shared tables keep a consistent design and distinguish detail navigation from nested actions', async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(context, 'officer')
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      for (const route of ['officer/hotzone-intel', 'officer/operations', 'officer/reports', 'raw-data', 'officer/hotzone-intel/zone-0', 'officer/optimization', 'officer/operations/task-0']) {
        console.log(`Checking ${theme} ${route}`)
        await page.goto(`${base}/dashboard/${route}`)
        if (route === 'officer/optimization') await page.getByRole('tab', { name: /Previous runs/ }).click()
        const table = page.locator('.ecopin-table').first()
        const row = table.locator('tbody tr.table-row-interactive').first()
        await row.waitFor()
        const header = await table.locator('thead th').first().evaluate(element => {
          const css = getComputedStyle(element)
          return { size: css.fontSize, padding: css.padding, transform: css.textTransform }
        })
        assert.deepEqual(header, { size: '13px', padding: '12px 16px', transform: 'none' }, route)
        assert.equal(await row.evaluate(element => getComputedStyle(element).cursor), 'pointer')
        const open = row.locator('td:last-child > .table-row-open')
        assert.equal(await open.count(), 1, `${route}: trailing detail action`)
        await page.mouse.move(0, 0)
        await page.waitForTimeout(180)
        const resting = await row.evaluate(element => getComputedStyle(element).backgroundColor)
        await row.hover()
        await page.waitForFunction(element => getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)', await row.elementHandle())
        assert.notEqual(await row.evaluate(element => getComputedStyle(element).backgroundColor), resting)
        await open.focus()
        assert.equal(await open.evaluate(element => element === document.activeElement), true)
        assert.ok(await row.evaluate(element => element.getBoundingClientRect().height >= 56))
        if (process.env.ECOPIN_SCREENSHOT_DIR && ['officer/reports', 'officer/operations/task-0'].includes(route)) await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/table-${route.replaceAll('/', '-')}-${theme}.png` })
      }

      await page.goto(`${base}/dashboard/officer/reports`)
      await page.getByRole('button', { name: 'View cluster zone-0', exact: true }).first().click()
      await page.waitForURL('**/dashboard/officer/hotzone-intel/zone-0')
      await page.goto(`${base}/dashboard/officer/reports`)
      const openReport = page.getByRole('button', { name: 'Open Reported waste near residential block 1 details', exact: true })
      await openReport.focus()
      await page.keyboard.press('Enter')
      await page.waitForURL('**/dashboard/raw-data/report-0')

      for (const width of [320, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${base}/dashboard/officer/operations`)
        await page.locator('.table-row-open').first().waitFor()
        assert.equal(await page.locator('#workspace-content').evaluate(element => element.scrollWidth > element.clientWidth + 1), false)
        const region = page.getByRole('region', { name: 'Cleanup tasks', exact: true })
        await region.focus()
        assert.equal(await region.evaluate(element => element === document.activeElement), true)
        if (process.env.ECOPIN_SCREENSHOT_DIR && width === 320) await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/table-mobile-${theme}.png` })
      }
      assert.deepEqual(errors, [])

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${base}/dashboard/officer/operations`)
      const taskTable = page.getByRole('region', { name: 'Cleanup tasks', exact: true })
      await taskTable.locator('.table-row-interactive').first().waitFor()
      const rowCount = await taskTable.locator('.table-row-interactive').count()
      await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('no-such-operation')
      await taskTable.locator('.table-empty').waitFor()
      assert.equal(await taskTable.getByRole('columnheader', { name: 'Title', exact: true }).count(), 1)
      assert.equal(await taskTable.locator('.table-row-open').count(), 0)
      await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('')
      await taskTable.locator('.table-row-interactive').first().waitFor()
      await page.waitForFunction(({ count }) => document.querySelectorAll('.table-row-interactive').length === count, { count: rowCount })

      await context.route('**/*', route => {
        if (!new URL(route.request().url()).pathname.endsWith('/trend')) return route.fallback()
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: {
          historical_points: [{ week_start: '2026-10-05', actual_count: 3 }],
          forecast_points: [{ week_start: '2026-10-19', predicted_count: 6, lower_bound: 1, upper_bound: 10 }],
        } }) })
      })
      await page.goto(`${base}/dashboard/spatial-scan`)
      await page.getByLabel('Hotspot results').getByRole('button').first().click()
      const drawer = page.getByRole('dialog', { name: 'Forecast zone 1', exact: true })
      await drawer.getByText('View trend values', { exact: true }).click()
      const trendTable = drawer.getByRole('region', { name: 'Weekly actual and projected reports', exact: true })
      await trendTable.waitFor()
      assert.equal(await trendTable.locator('tbody tr').count(), 2)
      assert.equal(await trendTable.locator('th').first().evaluate(element => getComputedStyle(element).fontSize), '13px')
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/table-trend-${theme}.png` })
      await context.close()

      const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await admin.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(admin, 'admin')
      const adminPage = await admin.newPage()
      for (const route of ['admin', 'admin/users', 'admin/audit-logs', 'admin/sys-logs', 'admin/infrastructure']) {
        await adminPage.goto(`${base}/dashboard/${route}`)
        const table = adminPage.locator('.ecopin-table').first()
        await table.locator('tbody tr').first().waitFor()
        assert.equal(await table.locator('thead th').first().evaluate(element => getComputedStyle(element).fontSize), '13px', route)
        assert.equal(await table.locator('.table-row-open').count(), 0, `${route}: no false detail affordance`)
      }
      await admin.close()
    }

    const touch = await browser.newContext({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    await fixtures(touch, 'officer')
    const touchPage = await touch.newPage()
    await touchPage.goto(`${base}/dashboard/officer/operations`)
    const touchAction = touchPage.locator('.table-row-open').first()
    await touchAction.waitFor()
    assert.equal(await touchAction.evaluate(element => getComputedStyle(element).opacity), '1', 'Detail affordance is visible on touch')
    assert.equal(await touchAction.evaluate(element => getComputedStyle(element).transitionDuration), '0s', 'Reduced motion removes transitions')
    await touch.close()
  } finally { await browser.close() }
})

test('loading and empty tables preserve their headers without exposing row actions', async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  let release
  const ready = new Promise(resolve => { release = resolve })
  try {
    const context = await browser.newContext()
    await fixtures(context, 'officer')
    await context.route('**/*', async route => {
      if (!new URL(route.request().url()).pathname.endsWith('/cleanup-tasks')) return route.fallback()
      await ready
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    })
    const page = await context.newPage()
    await page.goto(`${base}/dashboard/officer/operations`, { waitUntil: 'domcontentloaded' })
    const loading = page.getByRole('status', { name: 'Loading cleanup tasks', exact: true })
    await loading.waitFor()
    assert.equal(await loading.getByRole('columnheader', { name: 'Title', exact: true }).count(), 1)
    assert.equal(await loading.locator('.table-row-open').count(), 0)
    release()
    const table = page.getByRole('region', { name: 'Cleanup tasks', exact: true })
    await table.locator('.table-empty').waitFor()
    assert.equal(await table.getByRole('columnheader', { name: 'Title', exact: true }).count(), 1)
    assert.equal(await table.locator('.table-row-open').count(), 0)
  } finally { release(); await browser.close() }
})
