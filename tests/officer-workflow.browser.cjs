const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const source = fs.readFileSync(require.resolve('../components/onboarding/OfficerDispatchTour.js'), 'utf8')
const steps = JSON.parse(source.split('const steps = ')[1].split('\nexport default')[0])
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      await fixtures(context, 'officer')
      const page = await context.newPage()
      const errors = [], writes = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => {
        if (request.url().includes('/api/backend/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url())
      })
      await page.goto(`${base}/dashboard/officer`)
      const tour = page.getByRole('dialog', { name: 'Daily dispatch tutorial' })
      for (const [index, step] of steps.entries()) {
        await page.waitForURL(url => url.pathname === step.path)
        await tour.getByRole('heading', { name: step.title, exact: true }).waitFor()
        if (step.unavailable) await tour.getByText(step.unavailable, { exact: true }).waitFor()
        else {
          await page.locator(step.target).first().waitFor({ state: 'visible', timeout: 60000 })
          await page.waitForFunction(() => !document.querySelector('[data-tour-highlight]').hidden)
        }
        const card = await tour.locator('[data-tour-card]').boundingBox()
        assert.ok(card.x >= 0 && card.x + card.width <= width + 1, `${step.title}: card fits viewport`)
        assert.ok(card.y >= 0 && card.y + card.height <= 901, `${step.title}: card fits height`)
        if (index === 2) {
          await tour.getByRole('button', { name: 'Back', exact: true }).click()
          await page.waitForURL(url => url.pathname === steps[1].path)
          await tour.getByRole('heading', { name: steps[1].title, exact: true }).waitFor()
          await tour.getByRole('button', { name: 'Next', exact: true }).click()
          await page.waitForURL(url => url.pathname === step.path)
          await tour.getByRole('heading', { name: step.title, exact: true }).waitFor()
        }
        if (process.env.ECOPIN_SCREENSHOT_DIR && (index === 0 || index === 8)) await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/officer-tour-${width}-${index}.png` })
        console.log(`${width}px ${index + 1}: ${step.title}`)
        await tour.getByRole('button', { name: index === steps.length - 1 ? 'Finish' : 'Next', exact: true }).click()
      }
      await tour.waitFor({ state: 'hidden' })
      await page.goto(`${base}/dashboard/officer`)
      await page.getByRole('heading', { name: 'Command Center', exact: true }).waitFor()
      assert.equal(await tour.isVisible(), false, 'Completion persists')
      await page.goto(`${base}/dashboard/profile#onboarding-heading`)
      await page.getByRole('button', { name: 'Replay tutorial' }).click()
      await tour.getByRole('heading', { name: steps[0].title, exact: true }).waitFor()
      await page.keyboard.press('Escape')
      await tour.waitFor({ state: 'hidden' })
      assert.deepEqual(writes, [], 'Tour does not mutate backend data')
      assert.deepEqual(errors, [], 'No runtime errors')
      console.log(`PASS ${width}px: Back, Finish, persistence, replay and Escape`)
      await context.close()
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
