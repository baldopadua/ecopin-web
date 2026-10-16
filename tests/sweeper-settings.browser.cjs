const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
let diagnosticPage = null

const issueTypes = {
  waste: 30,
  flooding: 45,
  pollution: 20,
  infrastructure: 35,
  illegal_logging: 25,
  pending: 40,
  others: 15
}

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
      diagnosticPage = page
      const errors = []
      const mutations = []
      let configReads = 0
      let sla = 48
      const workTimes = { ...issueTypes }
      const slaRequests = []
      const workRequests = []

      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(themeName => {
        localStorage.setItem('theme', themeName)
        localStorage.setItem('authToken', `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`)
        localStorage.setItem('lastActivity', String(Date.now()))
      }, theme)
      await page.route('**/api/**', async route => {
        const request = route.request()
        const url = new URL(request.url())
        const pathname = url.pathname
        if (request.method() !== 'GET') mutations.push({ method: request.method(), pathname, body: request.postDataJSON() })

        if (pathname.endsWith('/auth/me')) {
          return route.fulfill({ status: 200, json: { user: { id: 'synthetic-admin', role: 'admin', full_name: 'Synthetic Admin' } } })
        }
        if (pathname.includes('validate-session')) return route.fulfill({ status: 200, json: { valid: true } })
        if (pathname.endsWith('/settings') && request.method() === 'GET') return route.fulfill({ status: 200, json: { session_timeout_minutes: 60 } })
        if (pathname.endsWith('/sweeper/config') && request.method() === 'GET') {
          configReads += 1
          if (configReads === 1) return route.fulfill({ status: 503, json: { message: 'Synthetic configuration outage' } })
          return route.fulfill({ status: 200, json: { slaThreshold: sla, workTimes: { ...workTimes } } })
        }
        if (pathname.endsWith('/sweeper/config/sla-threshold') && request.method() === 'PUT') {
          const body = request.postDataJSON()
          slaRequests.push(body)
          if (body.hours === 50) {
            sla = body.hours
            return route.fulfill({ status: 200, json: { slaThreshold: sla } })
          }
          if (body.hours === 72 && body.confirmLargeChange === true) {
            sla = body.hours
            return route.fulfill({ status: 200, json: { slaThreshold: sla } })
          }
          if (body.hours === 60) return route.fulfill({ status: 500, json: { message: 'Synthetic save failure' } })
          return route.fulfill({ status: 200, json: { slaThreshold: body.hours } })
        }
        if (pathname.endsWith('/sweeper/config/work-time') && request.method() === 'PUT') {
          const body = request.postDataJSON()
          workRequests.push(body)
          if (body.reportType === 'waste' && body.minutes === 40) {
            workTimes.waste = body.minutes
            return route.fulfill({ status: 200, json: { reportType: body.reportType, minutes: body.minutes } })
          }
          if (body.reportType === 'flooding' && body.minutes === 50) {
            return route.fulfill({ status: 500, json: { message: 'Synthetic work-time failure' } })
          }
          workTimes[body.reportType] = body.minutes
          return route.fulfill({ status: 200, json: { reportType: body.reportType, minutes: body.minutes } })
        }
        return route.fulfill({ status: 200, json: {} })
      })
      await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

      await page.goto(`${process.env.ECOPIN_TEST_URL || 'http://localhost:4001'}/dashboard/admin/sweeper-settings`)
      await page.getByRole('button', { name: 'Retry' }).waitFor()
      const loadError = page.getByRole('alert').filter({ hasText: /sweeper.*(load|configuration)/i })
      await loadError.waitFor()
      assert.equal(await page.getByRole('button', { name: 'Retry' }).count(), 1)
      assert.equal(await page.getByLabel('SLA threshold (hours)').count(), 0, 'settings form must wait for a successful load')
      await page.getByRole('button', { name: 'Retry' }).click()
      await page.getByRole('heading', { name: 'Sweeper settings' }).waitFor()
      assert.equal(await page.getByLabel('SLA threshold (hours)').inputValue(), '48')
      assert.ok(await page.getByRole('heading', { name: 'Work time estimates' }).count())
      assert.ok(await page.getByLabel('Waste work time (minutes)').count())
      assert.ok(await page.getByLabel('Flooding work time (minutes)').count())
      assert.ok(await page.getByRole('button', { name: 'Save Waste work time' }).isDisabled())

      const slaInput = page.getByLabel('SLA threshold (hours)')
      await slaInput.fill('50')
      await page.getByRole('button', { name: 'Save deadline' }).click()
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Save deadline' && button.disabled))
      assert.deepEqual(slaRequests[0], { hours: 50, confirmLargeChange: false })
      assert.ok(await page.getByRole('button', { name: 'Save deadline' }).isDisabled())

      await slaInput.fill('72')
      await page.getByRole('button', { name: 'Save deadline' }).click()
      const dialog = page.getByRole('dialog', { name: 'Confirm deadline change' })
      await dialog.waitFor()
      assert.equal(await dialog.getByRole('button', { name: 'Cancel' }).evaluate(el => el === document.activeElement), true)
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      assert.equal(await page.getByRole('dialog', { name: 'Confirm deadline change' }).isVisible(), false)
      assert.equal(slaRequests.length, 1, 'cancel must not call the API')
      await page.getByRole('button', { name: 'Save deadline' }).click()
      await page.getByRole('dialog', { name: 'Confirm deadline change' }).getByRole('button', { name: 'Confirm change' }).click()
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Save deadline' && button.disabled))
      assert.deepEqual(slaRequests[1], { hours: 72, confirmLargeChange: true })
      assert.ok(await page.getByRole('button', { name: 'Save deadline' }).isDisabled())

      const wasteInput = page.getByLabel('Waste work time (minutes)')
      await wasteInput.fill('40')
      await page.getByRole('button', { name: 'Save Waste work time' }).click()
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === 'Save Waste work time' && button.disabled))
      assert.deepEqual(workRequests[0], { reportType: 'waste', minutes: 40 })
      assert.ok(await page.getByRole('button', { name: 'Save Waste work time' }).isDisabled())

      const floodingInput = page.getByLabel('Flooding work time (minutes)')
      await floodingInput.fill('50')
      await page.getByRole('button', { name: 'Save Flooding work time' }).click()
      const workError = page.getByRole('alert').filter({ hasText: 'Synthetic work-time failure' })
      await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Synthetic work-time failure'))
      assert.equal(await floodingInput.inputValue(), '50', 'failed save must retain the edited value')
      assert.ok(await workError.isVisible(), 'save error stays visible')

      await slaInput.fill('60')
      await page.getByRole('button', { name: 'Save deadline' }).click()
      const slaError = page.getByRole('alert').filter({ hasText: 'Synthetic save failure' })
      await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Synthetic save failure'))
      assert.equal(await slaInput.inputValue(), '60', 'failed deadline save must retain the edited value')
      assert.ok(await slaError.isVisible(), 'deadline save error stays visible')

      assert.equal(await page.getByRole('heading', { name: 'Service-level deadline' }).count(), 1)
      assert.equal(await page.getByRole('heading', { name: 'Work time estimates' }).count(), 1)
      assert.equal(await page.locator('input[type="number"][min="1"][max="168"][step="1"][required]').count(), 1)
      assert.equal(await page.locator('input[type="number"][min="5"][max="120"][required]').count(), Object.keys(issueTypes).length)
      assert.equal(await page.getByRole('button', { name: /shift|csv|import/i }).count(), 0)

      await page.getByRole('button', { name: 'Dismiss notification' }).click()
      await slaInput.fill('72')
      await floodingInput.fill(String(issueTypes.flooding))
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme} ${width} document overflow`)
        assert.equal(await page.locator('main').evaluate(el => el.scrollWidth > el.clientWidth), false, `${theme} ${width} workspace overflow`)
        for (const control of [page.getByRole('button', { name: 'Save deadline' }), page.getByRole('button', { name: 'Save Waste work time' })]) {
          assert.ok(await control.evaluate(el => el.getBoundingClientRect().height >= 44), `${theme} ${width} controls meet touch target size`)
        }
        if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `sweeper-settings-${theme}-${width}.png`), fullPage: true })
      }

      assert.deepEqual(errors, [])
      assert.equal(mutations.length, 5, 'only the explicit save actions should mutate the mock API')
      assert.equal(configReads, 2)
      await page.close()
    }
    console.log('Sweeper settings: load retry, deadline confirmation, work-time saves, error retention, both themes, four widths, and touch targets passed against synthetic API mocks.')
  } finally { await browser.close() }
}

run().catch(async error => {
  console.error(error)
  if (diagnosticPage) {
    console.error(`Failure page: ${diagnosticPage.url()}`)
    console.error(`Failure page text: ${(await diagnosticPage.locator('body').innerText().catch(() => '')).slice(0, 4000)}`)
    if (process.env.ECOPIN_SCREENSHOT_DIR) {
      await diagnosticPage.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, 'sweeper-settings-failure.png'), fullPage: true }).catch(() => {})
    }
  }
  process.exitCode = 1
})
