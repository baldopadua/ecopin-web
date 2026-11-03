const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.ECOPIN_PLAYWRIGHT_PATH||'playwright');
const base='https://localhost:4101',backend='http://127.0.0.1:4102';
const backendRoot=path.resolve(__dirname,'../../parity-recovery-backend');
const fixtures=JSON.parse(fs.readFileSync(path.join(backendRoot,'.private/parity-fixtures.json'),'utf8'));
assert.equal(fixtures.url,'http://127.0.0.1:54321');
const output=path.resolve('output/t08');fs.mkdirSync(output,{recursive:true});
const results=[];function check(name,value){assert.ok(value,name);results.push({name,passed:true});console.log('PASS '+name);}
const id='a0800000-0000-4000-8000-000000000001',container='supabase_db_parity-recovery-backend';
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-c',q],{encoding:'utf8'}).trim();
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.ECOPIN_CHROMIUM_PATH});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const user=role=>fixtures.users.find(u=>u.role===role);
  const token=async role=>{const r=await context.request.post(backend+'/api/auth/login',{data:{email:user(role).email,password:fixtures.password}});assert.equal(r.status(),200);const d=await r.json();return d.session?.access_token||d.access_token||d.token;};
  const get=(t,p)=>context.request.get(backend+p,{headers:t?{Authorization:`Bearer ${t}`}:{}});
  const tok={};for(const role of ['officer','admin','citizen','field_crew'])tok[role]=await token(role);
  const res=await get(tok.officer,`/api/reports/${id}/case-record`);assert.equal(res.status(),200,'officer case record');
  const data=await res.json(),raw=JSON.stringify(data),owner=user('citizen').id,officerId=user('officer').id;
  // History reconciliation against the database and the existing history API.
  const dbEvents=sql(`select id||':'||event_type from operational_events where report_id='${id}' or (report_id is null and task_id='a0800000-0000-4000-8000-0000000000a1') order by id`).split('\n');
  check('events reconcile with the journal in record order',JSON.stringify(data.events.map(e=>e.id+':'+e.event_type))===JSON.stringify(dbEvents)&&dbEvents.length===4);
  check('incident vs task-context scope is labelled',data.events.filter(e=>e.scope==='incident').length===2&&data.events.filter(e=>e.scope==='task_context').length===2);
  const hist=await (await get(tok.officer,`/api/operational-events?report_id=${id}`)).json();
  check('incident-scope events match the audit history API',hist.events.filter(e=>e.report_id===id).length===2&&data.events.filter(e=>e.scope==='incident').every(e=>hist.events.some(h=>String(h.id)===e.id)));
  check('all 60 activity rows are present oldest first',data.activity.length===60&&data.activity.every((a,i,all)=>i===0||Date.parse(all[i-1].occurred_at)<=Date.parse(a.occurred_at)));
  check('report owner identity is excluded everywhere',!raw.includes(owner)&&data.activity.filter(a=>a.actor_id===null).length===48&&data.activity.filter(a=>a.actor_id===officerId).length===12);
  check('report facts are the stored values',data.report.id===id&&data.report.title==='T08_SYNTHETIC_CASE'&&Math.abs(data.report.latitude-14.5731)<1e-6&&Math.abs(data.report.longitude-121.0801)<1e-6&&data.report.on_private_property===true&&data.proof===null);
  check('record is private no-store',res.headers()['cache-control'].includes('no-store'));
  check('admin may read the same snapshot content',(await (await get(tok.admin,`/api/reports/${id}/case-record`)).json()).events.length===4);
  check('citizen owner and field crew are denied',(await get(tok.citizen,`/api/reports/${id}/case-record`)).status()===403&&(await get(tok.field_crew,`/api/reports/${id}/case-record`)).status()===403);
  check('signed-out API and proxy are denied',(await get(null,`/api/reports/${id}/case-record`)).status()===401&&(await context.request.get(base+`/api/backend/api/reports/${id}/case-record`)).status()===401);
  check('unknown incident is 404 and bad id is 400',(await get(tok.officer,'/api/reports/a0800000-0000-4000-8000-0000000000ff/case-record')).status()===404&&(await get(tok.officer,'/api/reports/not-an-id/case-record')).status()===400);
  const before=sql("select count(*) from operational_events")+'|'+sql("select count(*) from audit_logs");
  // Web: real officer session, actual print page.
  const login=await context.request.post(base+'/api/session/login',{headers:{Origin:base},data:{email:user('officer').email,password:fixtures.password}});assert.equal(login.status(),200);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=base+`/dashboard/raw-data/${id}/print`,printBtn=page.getByRole('button',{name:'Print / Save PDF',exact:true});
  // Failure first so retry is real: provider-style outage, oversize, and malformed snapshot.
  const pattern='**/api/backend/api/reports/*/case-record';
  await page.route(pattern,r=>r.fulfill({status:503,json:{message:'down'}}));await page.goto(url);
  const skip=page.getByRole('button',{name:'Skip tour',exact:true});if(await skip.count())await skip.click();
  await page.getByRole('alert').getByText(/could not load/).waitFor({timeout:60000});
  check('outage shows retry and blocks printing',await page.getByRole('button',{name:'Retry case record'}).count()===1&&await printBtn.isDisabled());
  await page.unroute(pattern);await page.route(pattern,r=>r.fulfill({status:422,json:{}}));await page.getByRole('button',{name:'Retry case record'}).click();
  await page.getByRole('alert').getByText(/too large for one printable record/).waitFor();check('oversize reports no partial history',await printBtn.isDisabled());
  await page.unroute(pattern);await page.route(pattern,async r=>{const j=await (await r.fetch()).json();j.events=null;await r.fulfill({json:j});});await page.getByRole('button',{name:'Retry case record'}).click();
  await page.getByRole('alert').getByText(/incomplete snapshot/).waitFor();check('malformed snapshot is refused',await printBtn.isDisabled());
  await page.unroute(pattern);await page.getByRole('button',{name:'Retry case record'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Print / Save PDF'&&!b.disabled),{},{timeout:60000});
  const sheet=page.locator('article[aria-label="Incident case record"]').first();
  const text=await sheet.innerText();
  check('retry loads the full record and enables printing',text.includes('T08_SYNTHETIC_CASE')&&text.includes('Recorded operational lifecycle (4)')&&text.includes('Incident activity history (60)'));
  check('coordinates, address and private-property status shown',text.includes('14.573100, 121.080100')&&text.includes('Synthetic Street 12')&&text.includes('Private property'));
  check('long narrative content is complete',text.includes('x'.repeat(160))&&text.includes('Second line of the narrative.'));
  check('masked identities are labelled, not invented',(text.match(/Not recorded \/ identity protected/g)||[]).length===48&&!text.includes(owner));
  check('no cleanup proof is claimed',text.includes('No officer-approved, privacy-reviewed public cleanup proof is available.'));
  await page.getByLabel('Additional access instructions (this PDF only)').fill('T08 print-only access instruction');
  check('citizen original photos are opt-in and off by default',!text.includes('Citizen evidence photos')&&!(await page.getByRole('checkbox').isChecked()));
  await page.screenshot({path:path.join(output,'case-record-screen.png'),fullPage:true});
  // A4 output.
  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({path:path.join(output,'case-record.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
  const raw1=pdf.toString('latin1'),pages=(raw1.match(/\/Type\s*\/Page[^s]/g)||[]).length,box=/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(raw1);
  check('PDF is A4 portrait and continues onto additional pages',Math.abs(box[1]-595.28)<1&&Math.abs(box[2]-841.89)<1&&pages>=3);
  const geometry=await page.evaluate(()=>{const root=document.querySelector('[data-ecopin-print-root]'),r=root.getBoundingClientRect(),bad=[];
   for(const el of root.querySelectorAll('*')){const b=el.getBoundingClientRect();if(!b.width)continue;
    if(b.right>r.right+1||b.left<r.left-1)bad.push(el.tagName+':'+(el.textContent||'').slice(0,40));
    if(['TD','TH','P','DD','H1','H2','H3','SMALL'].includes(el.tagName)&&el.scrollWidth>el.clientWidth+1)bad.push('scroll '+el.tagName+':'+(el.textContent||'').slice(0,40));}
   return {width:r.width,bad:bad.slice(0,10),bodyHidden:[...document.body.children].filter(c=>!c.hasAttribute('data-ecopin-print-root')&&!['SCRIPT','STYLE','NEXTJS-PORTAL'].includes(c.tagName)).every(c=>getComputedStyle(c).display==='none'),accessInPrint:root.innerText.includes('T08 print-only access instruction')};});
  check('no print element extends past the A4 content box',geometry.bad.length===0);
  check('only the print portal prints, with the access note',geometry.bodyHidden&&geometry.accessInPrint);
  await page.setViewportSize({width:794,height:1123});
  await page.screenshot({path:path.join(output,'case-record-print-emulation.png'),fullPage:true});
  await page.emulateMedia({media:'screen'});await page.setViewportSize({width:320,height:800});
  check('320px preview has no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({path:path.join(output,'case-record-320.png')});
  check('printing wrote no history and the page raised no exceptions',sql("select count(*) from operational_events")+'|'+sql("select count(*) from audit_logs")===before&&errors.length===0);
  // Role gating in the UI.
  const crewContext=await browser.newContext({ignoreHTTPSErrors:true});
  check('signed-out print page does not show the record',await (async()=>{const p=await crewContext.newPage();await p.goto(url);await p.waitForTimeout(3000);return !(await p.content()).includes('T08_SYNTHETIC_CASE');})());
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({pages,results},null,1));
  await crewContext.close();await context.close();
 }finally{await browser.close();}
}
main().then(()=>console.log(`ALL ${results.length} CHECKS PASSED`),e=>{console.error(e);process.exit(1);});
