const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.ECOPIN_CHROMIUM_PATH ? { executablePath: process.env.ECOPIN_CHROMIUM_PATH } : {}) })
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 600 }, reducedMotion: 'no-preference' })
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await fixtures(context, 'officer')
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/profile`)
      const main = page.locator('#workspace-content')
      await main.waitFor()
      await page.getByRole('link', { name: 'Command Center', exact: true }).waitFor()
      await main.evaluate(el => { el.scrollTop = el.scrollHeight })
      const previous = await main.evaluate(el => ({ scroll: el.scrollTop, overflow: el.style.overflow }))
      assert.ok(previous.scroll > 0, 'fixture begins on a scrolled flow page')
      let release
      const gate = new Promise(resolve => { release = resolve })
      await context.route('**/dashboard/officer?*', async route => { await gate; await route.continue() })
      await page.getByRole('link', { name: 'Command Center', exact: true }).click({ noWaitAfter: true })
      const status = page.getByRole('status', { name: 'Loading workspace view' })
      await status.waitFor()
      await page.locator('dialog img:visible').evaluate(image => image.decode())
      const ring = page.locator('dialog[open] svg')
      const movement = await ring.evaluate(async el => {
        const before = getComputedStyle(el).transform
        await new Promise(resolve => setTimeout(resolve, 150))
        return { before, after: getComputedStyle(el).transform }
      })
      assert.notEqual(movement.before, movement.after, 'spinner visibly rotates between rendered frames')
      if (process.env.ECOPIN_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.ECOPIN_SCREENSHOT_DIR, { recursive: true })
        await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/navigation-${theme}.png` })
      }
      const box = await page.locator('dialog[open]').boundingBox()
      assert.ok(box, 'loading uses the browser modal layer')
      assert.equal(box.x, 0)
      assert.equal(box.y, 0)
      assert.equal(box.width, 1366)
      assert.equal(box.height, 600)
      await page.setViewportSize({ width: 320, height: 700 })
      const narrowBox = await page.locator('dialog[open]').boundingBox()
      assert.equal(narrowBox.width, 320)
      assert.equal(narrowBox.height, 700)
      assert.ok(await status.evaluate(el => el.scrollWidth <= el.clientWidth), 'loading text fits narrow screens')
      if (process.env.ECOPIN_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.ECOPIN_SCREENSHOT_DIR}/navigation-${theme}-320.png` })
      await page.setViewportSize({ width: 1366, height: 600 })
      await page.mouse.move(800, 400)
      await page.mouse.wheel(0, -600)
      await page.keyboard.press('PageUp')
      await page.keyboard.press('Escape')
      assert.equal(await main.evaluate(el => el.scrollTop), previous.scroll, 'background scroll stays locked')
      assert.ok(await page.locator('dialog[open]').evaluate(el => el.matches(':modal') && el.contains(document.activeElement)), 'background cannot receive keyboard focus')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const reducedMovement = await ring.evaluate(async el => {
        const before = getComputedStyle(el).transform
        await new Promise(resolve => setTimeout(resolve, 150))
        return { before, after: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity }
      })
      assert.notEqual(reducedMovement.before, reducedMovement.after, 'spinner keeps rotating with reduced motion enabled')
      assert.equal(reducedMovement.opacity, '1', 'spinner does not pulse')
      release()
      await status.waitFor({ state: 'hidden' })
      assert.equal(await main.evaluate(el => el.style.overflow), previous.overflow, 'workspace overflow is restored')
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`${theme}: full viewport, scroll lock, focus, Escape, reduced motion and cleanup passed`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
