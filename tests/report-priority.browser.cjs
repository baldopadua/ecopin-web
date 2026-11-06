const assert = require('node:assert/strict')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
async function run() {
 const browser = await chromium.launch({headless:true, executablePath:process.env.ECOPIN_CHROMIUM_PATH})
 try {
  for (const width of [1366,390]) {
   const context = await browser.newContext({viewport:{width,height:900}})
   await fixtures(context,'officer')
   await context.addInitScript(() => localStorage.setItem('ecopin:dispatch-tour:v1:test-officer','disabled'))
   let priority = 'urgent'
   await context.route('**/api/**/reports/report-0', route => route.fulfill({contentType:'application/json',body:JSON.stringify({id:'report-0',title:'Priority display test',status:'unresolved',validation_status:'approved',citizen_priority:priority,severity_level:'high',created_at:'2026-11-06T00:00:00Z',latitude:14.6,longitude:121.08})}))
   await context.route('**/api/reports/report-0', route => route.fulfill({contentType:'application/json',body:JSON.stringify({id:'report-0',title:'Priority display test',status:'unresolved',validation_status:'approved',citizen_priority:priority,severity_level:'high',created_at:'2026-11-06T00:00:00Z',latitude:14.6,longitude:121.08})}))
   const page = await context.newPage()
   const errors=[];page.on('pageerror',e=>errors.push(e.message))
   for (const [value,label] of [['urgent','Urgent'],['non_urgent','Non-urgent'],[null,'Not specified']]) {
    priority=value
    for (const path of ['/reports/report-0','/dashboard/raw-data/report-0']) {
     await page.goto(base+path)
     const badge=page.locator('[data-report-priority]').filter({hasText:`Citizen priority: ${label}`})
     await badge.first().waitFor({timeout:60000})
     const rect=await badge.first().boundingBox()
     assert.ok(rect.width<=width, `${path} priority fits ${width}px`)
     console.log(`PASS ${width}px ${path}: ${label}`)
     if (process.env.ECOPIN_SCREENSHOT_DIR && value==='non_urgent') await page.screenshot({path:`${process.env.ECOPIN_SCREENSHOT_DIR}/priority-${width}-${path.startsWith('/reports')?'public':'officer'}.png`})
    }
   }
   assert.deepEqual(errors,[])
   await context.close()
  }
 } finally { await browser.close() }
}
run().catch(e=>{console.error(e);process.exitCode=1})
