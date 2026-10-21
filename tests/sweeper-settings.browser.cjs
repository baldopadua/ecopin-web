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
      const writes = []
      await context.route('**/api/sweeper/config/**', route => {
        writes.push({ path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() })
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) })
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/admin/sweeper-settings`, { waitUntil: 'domcontentloaded' })
      const deadline = page.getByRole('tab', { name: 'Service deadline', exact: true })
      const work = page.getByRole('tab', { name: 'Work time estimates', exact: true })
      await page.getByLabel('SLA threshold (hours)', { exact: true }).waitFor()
      await deadline.focus()
      await page.keyboard.press('ArrowRight')
      const focus = await work.evaluate(element => ({ offset: parseFloat(getComputedStyle(element).outlineOffset), focused: document.activeElement === element }))
      assert.equal(focus.focused, true)
      assert.ok(focus.offset < 0, 'Tab focus must remain inside the rounded button instead of being cut by the rail')
      const waste = page.getByLabel('Waste work time (minutes)', { exact: true })
      await waste.fill('40')
      await deadline.click()
      await page.getByLabel('SLA threshold (hours)', { exact: true }).fill('72')
      await work.click()
      assert.equal(await waste.inputValue(), '40')
      assert.equal(writes.length, 0)
      await page.getByRole('button', { name: 'Save Waste work time', exact: true }).click()
      await page.getByText('Waste work time saved.', { exact: true }).waitFor()
      await deadline.click()
      assert.equal(await page.getByLabel('SLA threshold (hours)', { exact: true }).inputValue(), '72')
      await page.getByRole('button', { name: 'Save deadline', exact: true }).click()
      const confirmation = page.getByRole('dialog', { name: 'Confirm deadline change', exact: true })
      await confirmation.waitFor()
      assert.equal(writes.length, 1, 'Large deadline changes must wait for confirmation')
      await confirmation.getByRole('button', { name: 'Confirm change', exact: true }).click()
      await page.getByText('Service-level deadline saved.', { exact: true }).waitFor()
      assert.equal(writes[1].body.confirmLargeChange, true)

      for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 1280, height: 600 }, { width: 768, height: 900 }, { width: 320, height: 844 }]) {
        await page.setViewportSize(viewport)
        for (const tab of [deadline, work]) {
          await tab.click()
          const panel = page.getByRole('tabpanel')
          assert.equal(await panel.count(), 1)
          const layout = await panel.evaluate(element => {
            const main = document.querySelector('#workspace-content')
            const body = element.firstElementChild
            const frame = body.getBoundingClientRect()
            return {
              overflow: main.scrollWidth > main.clientWidth + 1,
              clipped: body.scrollWidth > body.clientWidth + 1,
              radius: getComputedStyle(element).borderRadius,
              cards: [...element.querySelectorAll('form')].map(form => {
                const rect = form.getBoundingClientRect()
                return { left: rect.left - frame.left, right: frame.right - rect.right, radius: getComputedStyle(form).borderRadius }
              })
            }
          })
          assert.equal(layout.overflow, false, `${theme} ${viewport.width}: page overflow`)
          assert.equal(layout.clipped, false, `${theme} ${viewport.width}: content clipped horizontally`)
          assert.equal(layout.radius, '16px')
          assert.ok(layout.cards.every(card => card.left >= 6 && card.right >= 6), 'Cards need an inset for rounded borders and focus rings')
          await panel.evaluate(element => { element.firstElementChild.scrollTop = 0 })
          await page.locator('#workspace-content').evaluate(element => { element.scrollTop = 0 })
          if (process.env.ECOPIN_SCREENSHOT_DIR && [1366, 320].includes(viewport.width)) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `sweeper-${theme}-${viewport.width}-${await tab.getAttribute('id')}.png`) })
          const inputs = panel.locator('input')
          await inputs.last().scrollIntoViewIfNeeded()
          await inputs.last().focus()
          await page.keyboard.press('Tab')
        }
      }
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`Passed ${theme}: sweeper focus containment, rounded cards, responsive scrolling, tab drafts, saves and confirmation`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
