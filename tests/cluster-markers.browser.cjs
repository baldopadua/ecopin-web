const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.ECOPIN_PLAYWRIGHT_PATH || 'playwright')
const { fixtures } = require('./role-layout.browser.cjs')
const base = process.env.ECOPIN_TEST_BASE_URL || 'http://localhost:4001'
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname))
async function screenshot(page, name) {
  if (!process.env.ECOPIN_SCREENSHOT_DIR) return
  fs.mkdirSync(process.env.ECOPIN_SCREENSHOT_DIR,{recursive:true})
  await page.screenshot({path:path.join(process.env.ECOPIN_SCREENSHOT_DIR,name)})
}
const reports = Array.from({length:6},(_,i)=>({
  id:`00000000-0000-0000-0000-00000000000${i+1}`, title:`Cluster report ${i+1}`,status:'unresolved',
  validation_status:'approved',issue_type:'waste',location_precision:'exact',created_at:new Date().toISOString(),
  cluster_id:i<3?'normal':i<5?'overdue':null,latitude:14.561433+(i<3?0:i<5?.0012:-.001),
  longitude:121.075636+(i<3?0:i<5?.0015:-.0015),breached_at:i===3?'2026-10-18T00:00:00Z':null
}))
const clusters=[{id:'normal',report_count:3,issue_type:'waste',severity:'medium',center:{type:'Point',coordinates:[121.075636,14.561433]}},
  {id:'overdue',report_count:2,issue_type:'waste',severity:'high',center:{type:'Point',coordinates:[121.077136,14.562633]}}]
;(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.ECOPIN_CHROMIUM_PATH?{executablePath:process.env.ECOPIN_CHROMIUM_PATH}:{})})
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900}})
    await fixtures(context,'officer')
    await context.route('**/*',route=>{
      const path=new URL(route.request().url()).pathname.replace(/^\/api\/backend/,'')
      const json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
      if (/\/reports(?:\/staff)?$/.test(path)) return json(reports)
      if (path.endsWith('/clusters')) return json(clusters)
      if (/\/cleanup-tasks$|\/dispatch-blocks$/.test(path)) return json([])
      if (path.endsWith('/reports/batch-evidence')) return json({})
      return route.fallback()
    })
    const page=await context.newPage()
    page.setDefaultTimeout(20000)
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`${base}/dashboard/officer/operations/create`,{waitUntil:'domcontentloaded'})
    const normal=page.locator('.leaflet-marker-icon[title^="Waste cluster · 3 reports"]')
    const overdue=page.locator('.leaflet-marker-icon[title^="Waste cluster · 2 reports"]')
    await normal.waitFor({state:'visible'})
    assert.equal(await normal.locator('strong').innerText(),'3')
    assert.equal(await normal.locator('.lucide-layers').count(),1)
    assert.equal(await overdue.locator('.lucide-triangle-alert').count(),1)
    assert.match(await overdue.getAttribute('title'),/Overdue reports/)
    assert.equal(await page.locator('.standard-cluster-marker,.breached-cluster-marker').count(),0)
    await normal.click()
    await page.getByRole('heading',{name:'Reports (3 selected)',exact:true}).waitFor()
    await page.waitForTimeout(2000)
    for(let i=0;i<2;i++) { await page.locator('.leaflet-control-zoom-out').click(); await page.waitForTimeout(450) }
    await normal.waitFor({state:'visible'})
    assert.match(await normal.getAttribute('title'),/3 selected/)
    assert.equal(await normal.locator('[class*="selected"]').count(),1)
    await screenshot(page,'create-task-clusters-selected.png')
    await page.getByRole('button',{name:'Clear',exact:true}).click()
    await page.getByRole('checkbox').first().focus()
    await page.keyboard.press('Space')
    await page.getByRole('heading',{name:'Reports (1 selected)',exact:true}).waitFor()
    assert.match(await normal.getAttribute('title'),/1 selected/)
    assert.equal(await normal.locator('[class*="partial"]').count(),1)
    await normal.focus()
    assert.equal(await normal.evaluate(node=>document.activeElement===node),true)
    await page.getByRole('button',{name:'Clear',exact:true}).click()
    for(const theme of ['light','dark']) for(const width of [1440,1024,768,320]) {
      await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme)
      await page.setViewportSize({width,height:900})
      const mapTab=page.getByRole('button',{name:'Map',exact:true})
      if(await mapTab.isVisible()) await mapTab.click()
      await page.waitForTimeout(250)
      await normal.waitFor({state:'visible'})
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${theme} ${width}: overflow`)
      if(width===1440||width===320) await screenshot(page,`create-task-clusters-${theme}-${width}.png`)
    }
    assert.deepEqual(errors,[])
    console.log('PASS: modern count markers; overdue alert; group selection and partial selection; keyboard focus; light/dark at 320/768/1024/1440; no page errors.')
  } finally { await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
