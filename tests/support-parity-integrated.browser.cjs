const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.ECOPIN_PLAYWRIGHT_PATH||'playwright');
const base='https://localhost:4101',backend='http://127.0.0.1:4102';
const backendRoot=path.resolve(__dirname,'../../parity-recovery-backend');
const fixtures=JSON.parse(fs.readFileSync(path.join(backendRoot,'.private/parity-fixtures.json'),'utf8'));
assert.equal(fixtures.url,'http://127.0.0.1:54321');
const output=path.resolve('output/t06');fs.mkdirSync(output,{recursive:true});
const results=[];function check(name,value){assert.ok(value,name);results.push({name,passed:true});console.log('PASS '+name);}
const stamp=Date.now(),text=`T06 synthetic ticket ${stamp}: my report status has not changed.`,answer=`T06 synthetic staff reply ${stamp}.`;
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.ECOPIN_CHROMIUM_PATH});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const citizens=fixtures.users.filter(u=>u.role==='citizen'),[ca,cb]=citizens;assert.equal(citizens.length,2);
  const token=async user=>{const r=await context.request.post(backend+'/api/auth/login',{data:{email:user.email,password:fixtures.password}});assert.equal(r.status(),200,'login '+user.role);const d=await r.json();const t=d.session?.access_token||d.access_token||d.token;assert.ok(t);return t;};
  const api=(t,method,url,data)=>context.request.fetch(backend+url,{method,headers:{Authorization:`Bearer ${t}`},data});
  const [ta,tb,tcrew]=[await token(ca),await token(cb),await token(fixtures.users.find(u=>u.role==='field_crew'))];
  // Citizen creates and retrieves their own ticket through the real backend path used by the app.
  const bad=await api(ta,'POST','/api/support/tickets',{category:'status_inquiry',description:'short'});
  check('invalid ticket rejected without storing',bad.status()===400);
  const created=await api(ta,'POST','/api/support/tickets',{category:'status_inquiry',description:text,actor:cb.id,citizen_id:cb.id});
  assert.equal(created.status(),201);const ticket=await created.json();
  check('citizen creates ticket as open',ticket.status==='open'&&/^TCK-\d{6}$/.test(ticket.reference)&&created.headers()['cache-control'].includes('no-store'));
  const mine=await (await api(ta,'GET','/api/support/tickets/'+ticket.reference)).json();
  check('owner retrieves own ticket',mine.id===ticket.id&&mine.description===text&&!JSON.stringify(mine).includes(ca.id));
  check('ticket is listed for owner only',(await (await api(ta,'GET','/api/support/tickets?limit=50')).json()).tickets.some(t=>t.id===ticket.id)
   &&!(await (await api(tb,'GET','/api/support/tickets?limit=50')).json()).tickets.some(t=>t.id===ticket.id));
  check('client-supplied owner is ignored (other citizen denied)',(await api(tb,'GET','/api/support/tickets/'+ticket.reference)).status()===404);
  check('crew and citizen denied the staff queue',(await api(tcrew,'GET','/api/support/queue')).status()===403&&(await api(ta,'GET','/api/support/queue')).status()===403);
  check('signed-out proxy request denied',(await context.request.get(base+'/api/backend/api/support/queue')).status()===401);
  // Staff respond through the real web queue.
  const officer=fixtures.users.find(u=>u.role==='officer');
  const login=await context.request.post(base+'/api/session/login',{headers:{Origin:base},data:{email:officer.email,password:fixtures.password}});assert.equal(login.status(),200,'Actual officer web login');
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dashboard/support-tickets');
  const skip=page.getByRole('button',{name:'Skip tour',exact:true});if(await skip.count())await skip.click();
  const card=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:ticket.reference,exact:true})});
  await card.waitFor({timeout:60000});
  check('staff queue shows the ticket without citizen identity',(await card.innerText()).includes(text)&&!(await page.content()).includes(ca.id)&&!(await page.content()).includes(ca.email));
  await card.getByRole('button',{name:'Reply',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Reply shown to the citizen').fill(answer);
  // Failure first: the reply must survive an outage and be retryable.
  const pattern='**/api/backend/api/support/queue/*/respond';
  await page.route(pattern,route=>route.fulfill({status:503,json:{error:'Your reply could not be saved. Please try again.'}}));
  await dialog.getByRole('button',{name:'Send reply',exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  check('failed reply keeps text and reports the error',(await dialog.getByLabel('Reply shown to the citizen').inputValue())===answer&&(await dialog.getByRole('alert').innerText()).includes('could not be saved'));
  check('failed reply left citizen view unchanged',(await (await api(ta,'GET','/api/support/tickets/'+ticket.reference)).json()).response===null);
  await page.unroute(pattern);
  await dialog.getByLabel('Ticket status after replying').selectOption('resolved');
  await dialog.getByRole('button',{name:'Send reply',exact:true}).click();await dialog.waitFor({state:'detached'});
  // The Open filter no longer lists it; Resolved does, with the reply.
  await page.getByRole('button',{name:'Resolved',exact:true}).click();
  const resolved=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:ticket.reference,exact:true})});await resolved.waitFor({timeout:30000});
  check('staff sees resolved ticket with reply',(await resolved.innerText()).includes(answer));
  await page.getByRole('button',{name:'Open',exact:true}).click();
  const openList=await context.request.get(base+'/api/backend/api/support/queue?status=open&limit=100');
  const stillOpen=(await openList.json()).tickets.some(t=>t.id===ticket.id);
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await page.waitForResponse(r=>r.url().includes('/api/support/queue')&&r.request().method()==='GET');
  await page.waitForTimeout(500);
  check('resolved ticket leaves the open queue (API and UI)',!stillOpen&&await page.getByRole('heading',{name:ticket.reference,exact:true}).count()===0);
  await page.screenshot({path:path.join(output,'staff-queue.png'),fullPage:true});
  // Citizen sees the update.
  const after=await (await api(ta,'GET','/api/support/tickets/'+ticket.reference)).json();
  check('citizen sees staff response and status',after.response===answer&&after.status==='resolved'&&!!after.responded_at&&!!after.resolved_at&&!('handler_id' in after));
  const retry=await api(ta,'POST','/api/support/tickets',{category:'other',description:text+' again'});
  check('citizen can open another ticket after resolution',retry.status()===201);
  check('other citizen still denied after response',(await api(tb,'GET','/api/support/tickets/'+ticket.reference)).status()===404);
  check('reply to unknown ticket reports not found',(await context.request.post(base+'/api/backend/api/support/queue/99999999-9999-4999-8999-999999999999/respond',{headers:{Origin:base},data:{response:'x',status:'closed'}})).status()===404);
  check('staff page has no runtime exceptions',errors.length===0);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({ticket:ticket.reference,results},null,1));
  await context.close();
 }finally{await browser.close();}
}
main().then(()=>console.log(`ALL ${results.length} CHECKS PASSED`),e=>{console.error(e);process.exit(1);});
