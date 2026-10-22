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
      const calls = []
      await context.route('**/api/admin/**', route => {
        const url = new URL(route.request().url())
        calls.push({ path: url.pathname, method: route.request().method() })
        let body = {}
        if (url.pathname.endsWith('/disaster-recovery/status')) body = { storage_replication: { buckets: [{ bucket_name: 'report-evidence', primary_objects: 420, replica_objects: 420, parity_percent: 100, replication_lag_seconds: 180, sync_status: 'SYNCHRONIZED' }] } }
        if (url.pathname.endsWith('/environment-audit') || url.pathname.endsWith('/verify-preview-isolation')) body = { auditId: 'audit-synthetic', outcome: 'COMPLIANT', auditDigest: 'a'.repeat(64), passedChecks: 1, totalChecks: 1, checks: [{ name: 'Preview access requires authentication', message: 'Authentication is enforced for every preview deployment URL and environment.' }] }
        if (url.pathname.endsWith('/apm-status')) body = { provider: 'Sentry', sampleRates: { traces: .2 } }
        if (url.pathname.endsWith('/test-apm-alert')) body = { drillId: 'alert-synthetic', outcome: 'DELIVERED', severity: 'P1', piiScrubbingVerified: true, alertId: 'receipt-synthetic', verifiedChannels: ['Test webhook'], samplePayload: { eventType: 'test', message: 'Synthetic alert' } }
        if (url.pathname.endsWith('/verify-replication')) body = { buckets_checked: 1 }
        if (url.pathname.endsWith('/drill')) body = { drill_id: 'drill-synthetic', outcome: 'PASSED', slas: { measured_rpo_seconds: 120, measured_rto_minutes: 45 }, operator: { name: 'Test admin' }, verification_hash: 'b'.repeat(64), signoff_notes: 'Synthetic recovery passed' }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/dashboard/admin/infrastructure`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: 'Recovery overview', exact: true }).waitFor()
      const panel = page.getByRole('tabpanel')
      const tabs = page.getByRole('tab')
      assert.equal(await tabs.count(), 4)
      const initialCalls = calls.length
      for (let i = 0; i < 4; i++) await tabs.nth(i).click()
      assert.equal(calls.length, initialCalls, 'Tab changes must not reload or run checks')
      await tabs.first().focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true')

      for (const [index, button, result] of [
        [0, /Execute Recovery Drill Simulation/, 'Synthetic recovery passed'],
        [1, /Verify Bucket Replication Parity/, 'Cross-region replication parity verified'],
        [2, /Send APM Test Alert/, 'receipt-synthetic'],
        [3, /Audit Environment Isolation/, 'Environment Audit completed'],
      ]) {
        await tabs.nth(index).click()
        await panel.getByRole('button', { name: button }).click()
        await page.getByText(result, { exact: false }).first().waitFor()
      }
      await tabs.nth(2).click()
      await panel.getByText('receipt-synthetic', { exact: true }).waitFor()
      assert.equal(calls.filter(call => call.method === 'POST').length, 4, 'Only explicit actions may run checks')

      for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 320, height: 844 }]) {
        await page.setViewportSize(viewport)
        for (let i = 0; i < 4; i++) {
          await tabs.nth(i).click()
          assert.equal(await panel.count(), 1)
          assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(i).getAttribute('id'))
          const layout = await panel.evaluate(element => {
            const main = document.querySelector('#workspace-content')
            const cards = [...element.querySelectorAll(':scope > .card')].map(card => card.getBoundingClientRect().width)
            return { panel: element.getBoundingClientRect().width, cards, overflow: main.scrollWidth > main.clientWidth + 1 }
          })
          assert.equal(layout.overflow, false, `${theme} ${viewport.width} tab ${i}: horizontal overflow`)
          assert.ok(layout.cards.every(width => width >= layout.panel - 2), 'Main panels must use the full tab width')
          if (process.env.ECOPIN_SCREENSHOT_DIR && [1366, 320].includes(viewport.width)) await page.screenshot({ path: path.join(process.env.ECOPIN_SCREENSHOT_DIR, `infrastructure-${theme}-${viewport.width}-${i}.png`) })
        }
      }
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`Passed ${theme}: infrastructure tabs, full-width panels, check actions, retained results, keyboard and responsive layouts`)
    }
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
