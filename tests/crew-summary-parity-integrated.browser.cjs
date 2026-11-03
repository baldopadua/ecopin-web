const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.ECOPIN_PLAYWRIGHT_PATH||'playwright');
const base='https://localhost:4101',backend='http://127.0.0.1:4102';
const backendRoot=path.resolve(__dirname,'../../parity-recovery-backend');
const fixtures=JSON.parse(fs.readFileSync(path.join(backendRoot,'.private/parity-fixtures.json'),'utf8'));
assert.equal(fixtures.url,'http://127.0.0.1:54321');
const output=path.resolve('output/t10');fs.mkdirSync(output,{recursive:true});
const results=[];function check(name,value){assert.ok(value,name);results.push({name,passed:true});console.log('PASS '+name);}
const container='supabase_db_parity-recovery-backend';
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-c',q],{encoding:'utf8'}).trim();
// Independent ground truth: restates the period rules directly against the tables, not through the summary function.
function truth(a,b){
 const first=`(timestamp '${a}' at time zone 'Asia/Manila')`,until=`((timestamp '${b}'+interval '1 day') at time zone 'Asia/Manila')`;
 const ev=type=>`select count(*) from operational_events where time_basis='server' and event_type='${type}' and occurred_at>=${first} and occurred_at<${until}`;
 const blocks=`select count(*) from dispatch_access_blocks b where b.blocked_at<${until} and (b.blocked_at>=${first} or (b.cleared_at>=${first} and b.cleared_at<${until}) or b.cleared_at is null)`;
 const outcomes=`select count(*) from task_report_outcomes o where o.submitted_at>=${first} and o.submitted_at<${until} and (o.outcome in ('unable','skipped') or o.disposition in ('contested','verification_required'))`;
 const failures=`select count(*) from cleanup_tasks t where nullif(btrim(t.failure_reason),'')is not null and t.completed_at>=${first} and t.completed_at<${until}`;
 const ids=`select id from cleanup_tasks t where (t.created_at>=${first} and t.created_at<${until}) or (t.created_at<${until} and coalesce(t.status::text,'unknown') not in ('completed','cancelled'))
  union select task_id from operational_events where time_basis='server' and event_type in ('assignment','completion','verification') and occurred_at>=${first} and occurred_at<${until}
  union select id from cleanup_tasks where status::text='completed' and completed_at>=${first} and completed_at<${until}
  union select task_id from dispatch_access_blocks b where b.task_id is not null and b.blocked_at<${until} and (b.blocked_at>=${first} or (b.cleared_at>=${first} and b.cleared_at<${until}) or b.cleared_at is null)
  union select task_id from task_report_outcomes o where o.submitted_at>=${first} and o.submitted_at<${until} and (o.outcome in ('unable','skipped') or o.disposition in ('contested','verification_required'))
  union select id from cleanup_tasks t where nullif(btrim(t.failure_reason),'')is not null and t.completed_at>=${first} and t.completed_at<${until}`;
 return {assignments:+sql(ev('assignment')),verified:+sql(ev('verification')),obstacles:+sql(blocks)+ +sql(outcomes)+ +sql(failures),tasks:+sql(`select count(*) from cleanup_tasks where id in (${ids})`)};
}
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.ECOPIN_CHROMIUM_PATH});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const user=role=>fixtures.users.find(u=>u.role===role);
  const token=async role=>{const r=await context.request.post(backend+'/api/auth/login',{data:{email:user(role).email,password:fixtures.password}});assert.equal(r.status(),200);const d=await r.json();return d.session?.access_token||d.access_token||d.token;};
  const tok={};for(const r of ['officer','admin','citizen','field_crew'])tok[r]=await token(r);
  const get=(t,q)=>context.request.get(backend+'/api/sweeper/operations-summary'+q,{headers:t?{Authorization:`Bearer ${t}`}:{}});
  const counts=j=>Object.fromEntries(['tasks','assignments','waypoints','verified','obstacles'].map(k=>[k,j[k].length]));
  // --- Reconciliation with the fixture periods ---
  const periods=[['2026-11-02','2026-11-02',1],['2026-11-03','2026-11-03',0],['2026-11-01','2026-11-03',1],['2026-10-01','2026-10-01',0],['2026-11-01','2026-11-01',0]];
  const bodies={};
  for(const [a,b,wp] of periods){
   const r=await get(tok.officer,`?from=${a}&through=${b}`);assert.equal(r.status(),200);const j=await r.json();bodies[a+b]=j;const t=truth(a,b),c=counts(j);
   check(`${a}..${b}: tasks, assignments, proof reviews and obstacles equal the table ground truth`,c.tasks===t.tasks&&c.assignments===t.assignments&&c.verified===t.verified&&c.obstacles===t.obstacles);
   check(`${a}..${b}: route stops with completion equal the fixture (${wp})`,c.waypoints===wp);
  }
  const day=bodies['2026-11-022026-11-02'];
  const titles=day.tasks.map(t=>t.title).sort();
  check('Manila day boundaries: 00:00 and 23:59:59 included, next midnight excluded',titles.includes('T10_SYNTHETIC_EDGE_START')&&titles.includes('T10_SYNTHETIC_EDGE_END')&&!titles.includes('T10_SYNTHETIC_EDGE_NEXT')&&bodies['2026-11-032026-11-03'].tasks.some(t=>t.title==='T10_SYNTHETIC_EDGE_NEXT'));
  check('waypoint maps the completed task to its approved route and crew',day.waypoints[0].task_id==='a1000000-0000-4000-8000-0000000000a1'&&day.waypoints[0].crew_name==='T10_SYNTHETIC_CREW'&&(()=>{const ref=day.waypoints[0].completion_ref;return /^journal:[0-9]+$/.test(ref)&&sql("select task_id||'|'||event_type from operational_events where id="+ref.slice(8))==='a1000000-0000-4000-8000-0000000000a1|completion';})());
  check('obstacles cover open block, in-period cleared block and the dated task failure',['access_block','task_failure'].every(s=>day.obstacles.some(o=>o.source===s))&&day.obstacles.filter(o=>o.source==='access_block').length===2);
  // The flag must follow the real publication: true while the reviewed publication is current, false once a re-review superseded it.
  const currentMatch=sql("select coalesce((select e.details->>'publication_id'=p.id::text from operational_events e join cleanup_proof_publications p on p.report_id=e.report_id where e.event_type='verification' and e.report_id='a0900000-0000-4000-8000-000000000001' and e.occurred_at='2026-11-02 05:00:00Z'),false)");
  check('proof review event flags whether it still matches the current published proof',day.verified[0].source_matches===(currentMatch==='t')&&day.verified[0].report_id==='a0900000-0000-4000-8000-000000000001');
  const raw=JSON.stringify(bodies['2026-11-012026-11-03']);
  check('citizen/report-owner identity is not in the summary',!raw.includes(user('citizen').id)&&!raw.includes(user('citizen').email));
  check('the empty period returns explicit empty lists, not an error',Object.values(counts(bodies['2026-10-012026-10-01'])).every(n=>n===0));
  check('the default period is today (Manila) and responses are private no-store',(await (await get(tok.officer,'')).json()).start_day===sql("select to_char(now() at time zone 'Asia/Manila','YYYY-MM-DD')")&&(await get(tok.officer,'?from=2026-11-02')).headers()['cache-control'].includes('no-store'));
  // --- Access / range / error behaviour ---
  check('admin may read the same period',(await (await get(tok.admin,'?from=2026-11-02&through=2026-11-02')).json()).tasks.length===day.tasks.length);
  check('citizen and field crew are denied; signed-out is 401',(await get(tok.citizen,'')).status()===403&&(await get(tok.field_crew,'')).status()===403&&(await get(null,'')).status()===401&&(await context.request.get(base+'/api/backend/api/sweeper/operations-summary')).status()===401);
  for(const q of ['?from=2999-01-01','?from=2026-11-03&through=2026-11-02','?from=2026-02-30','?from=abc','?from=2025-01-01&through=2026-11-03','?from=2026-11-01&from=2026-11-02'])
   check('invalid or oversized range is 400: '+q,(await get(tok.officer,q)).status()===400);
  check('input is not injectable',(await get(tok.officer,"?from=2026-11-02'%3Bdrop%20table%20reports%3B--")).status()===400&&sql("select count(*) from reports where id='a0900000-0000-4000-8000-000000000001'")==='1');
  // --- Web page: date selection, counts, print ---
  const login=await context.request.post(base+'/api/session/login',{headers:{Origin:base},data:{email:user('officer').email,password:fixtures.password}});assert.equal(login.status(),200);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const printBtn=page.getByRole('button',{name:'Print / Save PDF',exact:true});
  const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Print / Save PDF'&&!b.disabled),{},{timeout:90000});
  await page.goto(base+'/dashboard/operations-summary?from=2026-11-02&through=2026-11-02');
  const skip=page.getByRole('button',{name:'Skip tour',exact:true});if(await skip.count())await skip.click().catch(()=>{});
  await ready();
  const sheet=page.locator('article[aria-label="Field crew operations summary"]').first(),text=await sheet.innerText();
  check('daily sheet shows the reconciled counts',/Tasks listed\s*5/.test(text)&&/Assignment changes\s*1/.test(text)&&/Completion-linked stops\s*1/.test(text));
  check('sheet lists the fixture task, crew and block narrative',text.includes('T10_SYNTHETIC_COMPLETED')&&text.includes('T10_SYNTHETIC_CREW')&&text.includes('T10 synthetic open block')&&text.includes('T10 synthetic: gate locked, no contact'));
  check('reporter identity is withheld on the sheet',!text.includes(user('citizen').id));
  // Date selection through the form.
  await page.getByLabel('From date').fill('2026-11-01');await page.getByLabel('Through date').fill('2026-11-03');
  check('unapplied dates block printing',await printBtn.isDisabled()&&(await page.getByText('Date changes are not applied yet').count())===1);
  await page.getByRole('button',{name:'Apply dates'}).click();await page.waitForURL(/from=2026-11-01&through=2026-11-03/);await ready();
  const range=await page.locator('article[aria-label="Field crew operations summary"]').first().innerText(),rb=bodies['2026-11-012026-11-03'];
  check('applied range shows its own reconciled counts',new RegExp(`Tasks listed\\s*${rb.tasks.length}`).test(range)&&new RegExp(`Assignment changes\\s*${rb.assignments.length}`).test(range)&&range.includes('through 2026-11-03'));
  await page.getByLabel('Through date').fill('2999-01-01');await page.getByRole('button',{name:'Apply dates'}).click();
  check('an invalid date is explained without loading',(await page.locator('[role=alert]:not(#__next-route-announcer__)').innerText()).includes('valid Manila calendar days'));
  await page.getByLabel('Through date').fill('2026-11-03');await page.getByLabel('From date').fill('2026-11-01');
  // Failures and retry.
  const pattern='**/api/backend/api/sweeper/operations-summary*';
  await page.route(pattern,r=>r.fulfill({status:503,json:{error:'down'}}));await page.getByRole('button',{name:'Reload summary'}).click();
  await page.locator('[role=alert]:not(#__next-route-announcer__)').getByText(/could not load/).waitFor();
  check('outage blocks printing and offers retry',await printBtn.isDisabled()&&await page.getByRole('button',{name:'Retry operations summary'}).count()===1);
  await page.unroute(pattern);await page.route(pattern,r=>r.fulfill({status:422,json:{}}));await page.getByRole('button',{name:'Retry operations summary'}).click();
  await page.locator('[role=alert]:not(#__next-route-announcer__)').getByText(/Summary too large/).waitFor();check('oversize says no partial export',await printBtn.isDisabled());
  await page.unroute(pattern);await page.route(pattern,async r=>{const j=await (await r.fetch()).json();j.start_day='2000-01-01';await r.fulfill({json:j});});await page.getByRole('button',{name:'Retry operations summary'}).click();
  await page.locator('[role=alert]:not(#__next-route-announcer__)').getByText(/incomplete data/).waitFor();check('a snapshot for another period is refused',await printBtn.isDisabled());
  await page.unroute(pattern);await page.getByRole('button',{name:'Retry operations summary'}).click();await ready();
  check('retry restores a printable record',await printBtn.isEnabled());
  // Print inspection for the single day.
  await page.goto(base+'/dashboard/operations-summary?from=2026-11-02&through=2026-11-02');await ready();
  await page.screenshot({path:path.join(output,'summary-screen.png'),fullPage:true});
  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({path:path.join(output,'operations-summary.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
  const raw1=pdf.toString('latin1'),pages=(raw1.match(/\/Type\s*\/Page[^s]/g)||[]).length,box=/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(raw1);
  check('PDF is A4 portrait',Math.abs(box[1]-595.28)<1&&Math.abs(box[2]-841.89)<1&&pages>=1);
  const geometry=await page.evaluate(()=>{const root=document.querySelector('[data-ecopin-print-root]'),r=root.getBoundingClientRect(),bad=[];
   for(const el of root.querySelectorAll('*')){const b=el.getBoundingClientRect();if(!b.width)continue;if(b.right>r.right+1||b.left<r.left-1)bad.push(el.tagName+':'+(el.textContent||'').slice(0,40));
    if(['TD','TH','P','DD','H1','H2','SMALL','CAPTION'].includes(el.tagName)&&el.scrollWidth>el.clientWidth+1)bad.push('scroll '+el.tagName+':'+(el.textContent||'').slice(0,40));}
   return {bad:bad.slice(0,10),printed:root.innerText.includes('Field crew operations')||root.innerText.includes('Daily field crew operations')};});
  check('no print element extends past the A4 content box',geometry.bad.length===0&&geometry.printed);
  await page.setViewportSize({width:794,height:1123});await page.screenshot({path:path.join(output,'summary-print-emulation.png'),fullPage:true});
  await page.emulateMedia({media:'screen'});await page.setViewportSize({width:320,height:800});
  check('320px view has no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  check('page raised no exceptions',errors.length===0);
  const side=await browser.newContext({ignoreHTTPSErrors:true});const p2=await side.newPage();await p2.goto(base+'/dashboard/operations-summary');await p2.waitForTimeout(3000);
  check('signed-out page shows no summary',!(await p2.content()).includes('T10_SYNTHETIC'));await side.close();
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({pages,results},null,1));
  await context.close();
 }finally{await browser.close();}
}
main().then(()=>console.log(`ALL ${results.length} CHECKS PASSED`),e=>{console.error(e);process.exit(1);});
