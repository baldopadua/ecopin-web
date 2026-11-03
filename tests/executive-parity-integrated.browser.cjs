const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.ECOPIN_PLAYWRIGHT_PATH||'playwright');
const base='https://localhost:4101',backend='http://127.0.0.1:4102';
const backendRoot=path.resolve(__dirname,'../../parity-recovery-backend');
const credentials=JSON.parse(fs.readFileSync(path.join(backendRoot,'.private/parity-fixtures.json'),'utf8'));
const output=path.resolve('output/t04');fs.mkdirSync(output,{recursive:true});
const results=[];function check(name,condition){assert.ok(condition,name);results.push({name,passed:true});}
async function main(){
 const {validateExecutiveSnapshot}=await import(pathToFileURL(path.resolve('lib/barangay-executive.mjs')));
 const browser=await chromium.launch({headless:true,executablePath:process.env.ECOPIN_CHROMIUM_PATH});
 try{
  for(const role of ['officer','admin']){
   const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
   const user=credentials.users.find(user=>user.role===role);
   const login=await context.request.post(base+'/api/session/login',{headers:{Origin:base},data:{email:user.email,password:credentials.password}});
   const loginBody=await login.json();
   assert.equal(login.status(),200,`Real web login failed: ${loginBody.error||'unexpected response'}`);
   const response=await context.request.get(base+'/api/backend/api/analytics/barangay/executive?month=2026-10');
   assert.equal(response.status(),200,`Executive proxy returned ${response.status()}`);
   const snapshot=await response.json();validateExecutiveSnapshot(snapshot,'2026-10');
   const total=snapshot.monthly.total;
   check(`${role}: October Manila count reconciles`,total.report_count===4&&total.approved_count===2&&total.rejected_count===1&&total.pending_count===1);
   check(`${role}: current backlog is not month-end backlog`,total.backlog_total===4);
   check(`${role}: resolution sample reconciles`,total.resolution_count===1&&total.median_resolution_hours===48&&total.average_resolution_hours===48&&total.p90_resolution_hours===48);
   check(`${role}: complete official coverage`,snapshot.monthly.groups.length===31);
   const serialized=JSON.stringify(snapshot);
   check(`${role}: private report details absent`,!serialized.includes('PRIVATE_T04_')&&!credentials.users.some(user=>serialized.includes(user.id)||serialized.includes(user.email)));
   check(`${role}: private response is not cached`,response.headers()['cache-control'].includes('no-store'));
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/dashboard/officer/metrics/barangay-print/2026-10');
   const print=page.getByRole('button',{name:'Print / Save PDF',exact:true});
   await print.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Print / Save PDF'&&!button.disabled),{},{timeout:60000});
   const sheet=page.locator('main article');
   for(const caption of ['Submissions and current verification state · 2026-10','Current all-time backlog by elapsed age at the snapshot','SWMO resolution events in 2026-10 · duration in hours'])
    check(`${role}: all appendix rows ${caption}`,await sheet.getByRole('table',{name:caption,exact:true}).locator('tbody tr').count()===32);
   check(`${role}: October remains selected`,await page.getByLabel('Report month',{exact:true}).inputValue()==='2026-10');
   check(`${role}: report text excludes fixture details`,!(await sheet.innerText()).includes('PRIVATE_T04_'));
   await print.click();
   await page.emulateMedia({media:'print'});
   await page.pdf({path:path.join(output,`synthetic-october-${role}.pdf`),format:'A4',preferCSSPageSize:true,printBackground:true});
   await page.emulateMedia({media:'screen'});
   await page.screenshot({path:path.join(output,`${role}-1440.png`),fullPage:true});
   await page.getByLabel('Report month',{exact:true}).fill('2026-09');
   check(`${role}: draft month blocks print`,await print.isDisabled());
   await page.getByLabel('Report month',{exact:true}).fill('2026-10');
   if(role==='officer'){
    await page.setViewportSize({width:320,height:900});
    check('mobile report has no horizontal document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,'officer-320.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    // Fault injection supplements the successful real API path; it does not replace it.
    let mode='stale';
    await page.route('**/api/backend/api/analytics/barangay/executive?*',async route=>{
     if(mode==='failed')return route.fulfill({status:503,json:{error:'Synthetic upstream failure'}});
     const upstream=await route.fetch(),data=await upstream.json();
     if(mode==='stale'){data.generated_at=new Date(Date.now()-25*3600000).toISOString();data.monthly.generated_at=data.generated_at;data.comparison.generated_at=data.generated_at;}
     await route.fulfill({response:upstream,json:data});
    });
    await page.getByRole('button',{name:'Reload report',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Statistics snapshot expired'}).waitFor();
    check('stale snapshot blocks print action',await print.isDisabled());
    await page.emulateMedia({media:'print'});await page.pdf({path:path.join(output,'synthetic-stale-blocked.pdf'),format:'A4',preferCSSPageSize:true});await page.emulateMedia({media:'screen'});
    mode='failed';await page.getByRole('button',{name:'Reload report',exact:true}).click();
    await page.getByRole('button',{name:'Retry executive report',exact:true}).waitFor();
    check('failed response clears old report',await sheet.count()===0);
    mode='ready';await page.getByRole('button',{name:'Retry executive report',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Print / Save PDF'&&!button.disabled));
    check('retry recovers real report',await sheet.count()===1);
   }
   check(`${role}: no page runtime exceptions`,errors.length===0);
   await context.close();
  }
  const anonymous=await browser.newContext({ignoreHTTPSErrors:true});
  check('signed out proxy access denied',(await anonymous.request.get(base+'/api/backend/api/analytics/barangay/executive?month=2026-10')).status()===401);
  await anonymous.close();
  for(const role of ['citizen','field_crew']){
   const user=credentials.users.find(user=>user.role===role);
   const login=await fetch(backend+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:credentials.password})});
   assert.equal(login.status,200);const auth=await login.json();
   const response=await fetch(backend+'/api/analytics/barangay/executive?month=2026-10',{headers:{Authorization:`Bearer ${auth.token}`}});
   check(`${role}: actual authenticated report access denied`,response.status===403);
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({scope:'synthetic isolated integration',results},null,2));
 console.log(JSON.stringify({checks:results.length,passed:results.length,output:'output/t04'}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
