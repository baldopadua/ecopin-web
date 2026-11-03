const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.ECOPIN_PLAYWRIGHT_PATH||'playwright');
const base='https://localhost:4101',backend='http://127.0.0.1:4102',supa='http://127.0.0.1:54321';
const backendRoot=path.resolve(__dirname,'../../parity-recovery-backend');
const {createCanvas,loadImage}=require(path.join(backendRoot,'node_modules/canvas'));
const fixtures=JSON.parse(fs.readFileSync(path.join(backendRoot,'.private/parity-fixtures.json'),'utf8'));
const env=Object.fromEntries(fs.readFileSync(path.join(backendRoot,'.env'),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
assert.equal(fixtures.url,supa);assert.equal(env.SUPABASE_URL,supa);
const output=path.resolve('output/t09');fs.mkdirSync(output,{recursive:true});
const results=[];function check(name,value){assert.ok(value,name);results.push({name,passed:true});console.log('PASS '+name);}
const id='a0900000-0000-4000-8000-000000000001',container='supabase_db_parity-recovery-backend',MARKER='T09_SENSITIVE_METADATA_MARKER';
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-c',q],{encoding:'utf8'}).trim();
const pixel=async(buf,fx,fy)=>{const img=await loadImage(buf),c=createCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);const [r,g,b]=x.getImageData(Math.floor(fx*img.width),Math.floor(fy*img.height),1,1).data;return {r,g,b};};
const isBlack=p=>p.r<40&&p.g<40&&p.b<40,isYellow=p=>p.r>200&&p.g>200&&p.b<90;
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.ECOPIN_CHROMIUM_PATH});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1100}});
  const user=(role,n=0)=>fixtures.users.filter(u=>u.role===role)[n];
  const token=async u=>{const r=await context.request.post(backend+'/api/auth/login',{data:{email:u.email,password:fixtures.password}});assert.equal(r.status(),200);const d=await r.json();return d.session?.access_token||d.access_token||d.token;};
  const t={officer:await token(user('officer')),admin:await token(user('admin')),ownerA:await token(user('citizen',0)),citizenB:await token(user('citizen',1)),crew:await token(user('field_crew'))};
  const api=(tok,p,opt={})=>context.request.fetch(backend+p,{method:opt.method||'GET',headers:{...(tok?{Authorization:`Bearer ${tok}`}:{}),...(opt.headers||{})},data:opt.data});
  const proof=`/api/reports/${id}/cleanup-proof`;
  const storage=(tok,bucket,p)=>context.request.get(`${supa}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${p}`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(tok?{Authorization:`Bearer ${tok}`}:{})}});
  check('fixture starts with no publication',sql(`select count(*) from cleanup_proof_publications where report_id='${id}'`)==='0');
  // --- Before publication: protected access ---
  const source=await (await api(t.officer,proof)).json();
  check('officer source lists both Before and both After originals',source.before_urls.length===2&&source.after_urls.length===2&&source.version===0&&!!source.completed_at&&source.publication_id===null);
  const orig=await api(t.officer,`${proof}/original/before/0`);const origBuf=await orig.body();
  check('officer original is JPEG pixels with source metadata removed',orig.status()===200&&orig.headers()['content-type'].includes('image/jpeg')&&!origBuf.toString('latin1').includes(MARKER)&&isYellow(await pixel(origBuf,0.6,0.6)));
  check('officer reaches the second photo by index; a third is 404',(await api(t.officer,`${proof}/original/after/1`)).status()===200&&(await api(t.officer,`${proof}/original/after/2`)).status()===404);
  check('admin may read the officer source',(await api(t.admin,proof)).status()===200);
  for(const [who,expected] of [['crew',403],['ownerA',403],['citizenB',403],[null,401]])
   check(`${who||'signed-out'} is refused the officer source and originals`,(await api(who&&t[who],proof)).status()===expected&&(await api(who&&t[who],`${proof}/original/before/0`)).status()===expected&&(await api(who&&t[who],proof,{method:'POST',data:{}})).status()===expected);
  const owner=await (await api(t.ownerA,`${proof}/owner`)).json();
  check('owner sees only owner-only links for 2+2 photos, not a reviewed claim',owner.proof.owner_only===true&&owner.proof.before_urls.length===2&&owner.proof.after_urls.length===2&&!('verified_at' in owner.proof));
  const ownerImg=await api(t.ownerA,`${proof}/owner/before/1`);const ownerBuf=await ownerImg.body();
  check('owner receives their own original bytes (private, no-store)',ownerImg.status()===200&&ownerImg.headers()['cache-control'].includes('no-store')&&!ownerBuf.toString('latin1').includes(MARKER)&&isYellow(await pixel(ownerBuf,0.6,0.6)));
  check('another citizen and signed-out callers get no owner photos',(await api(t.citizenB,`${proof}/owner/before/0`)).status()===404&&(await api(t.citizenB,`${proof}/owner`)).status()===404&&(await api(null,`${proof}/owner`)).status()===401);
  const publicBefore=await (await api(null,`${proof}/public`)).json();
  check('nothing is public before review',publicBefore.proof===null&&(await api(null,`${proof}/public/d0900000-0000-4000-8000-000000000001/before/0`)).status()===404);
  // Direct storage access, bypassing the backend.
  const originalPath=`${id}/before/b0900000-0000-4000-8000-000000000001.jpg`;
  for(const [who,tok] of [['anonymous',null],['report owner',t.ownerA],['other citizen',t.citizenB],['field crew',t.crew]])
   check(`${who} cannot download originals directly from storage`,(await storage(tok,'Cleanup Originals',originalPath)).status()>=400);
  // --- Review and publish through the real UI ---
  const login=await context.request.post(base+'/api/session/login',{headers:{Origin:base},data:{email:user('officer').email,password:fixtures.password}});assert.equal(login.status(),200);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+`/dashboard/raw-data/${id}`);
  const skip=page.getByRole('button',{name:'Skip tour',exact:true});if(await skip.count())await skip.click().catch(()=>{});
  const section=page.getByRole('region',{name:'Officer cleanup proof review'});await section.waitFor({timeout:90000});
  check('proof review is mounted on the staff incident page',await section.count()===1);
  await section.getByRole('button',{name:'Load proof for review'}).click();
  for(const legend of ['before cleanup, photo 1 of 2','before cleanup, photo 2 of 2','after cleanup, photo 1 of 2','after cleanup, photo 2 of 2'])await section.getByRole('group',{name:legend}).waitFor({timeout:60000});
  const submit=section.getByRole('button',{name:'Verify and publish redacted proof'});
  await section.getByRole('button',{name:'Add hidden area to before photo 1'}).click();
  for(const [k,v] of [['x',50],['y',50],['width',25],['height',25]])await section.getByLabel(`before photo 1 area 1 ${k} (%)`).fill(String(v));
  await section.getByLabel(/Public action notes/).fill('T09 synthetic public notes: debris removed and area swept.');
  await section.getByRole('checkbox').check();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Verify and publish redacted proof'&&!b.disabled),{},{timeout:60000});
  await page.screenshot({path:path.join(output,'review-before-publish.png'),fullPage:true});
  // Failure first: a rejected request must keep the review and publish nothing.
  const pattern=`**/api/backend/api/reports/${id}/cleanup-proof`;
  await page.route(pattern,r=>r.request().method()==='POST'?r.fulfill({status:503,json:{message:'down'}}):r.continue());
  await submit.click();await section.getByRole('alert').waitFor();
  check('failed publication reports an error, keeps the form and stores nothing',(await section.getByRole('alert').innerText()).includes('not approved')&&await submit.isVisible()&&sql(`select count(*) from cleanup_proof_publications where report_id='${id}'`)==='0');
  await page.unroute(pattern);
  await submit.click();await section.getByRole('status').filter({hasText:'Cleanup proof verified'}).waitFor({timeout:60000});
  const pub=sql(`select id||'|'||jsonb_array_length(before_paths)||'|'||jsonb_array_length(after_paths) from cleanup_proof_publications where report_id='${id}'`).split('|');
  check('exactly one publication with two reviewed copies per slot',pub.length===3&&pub[1]==='2'&&pub[2]==='2'&&sql(`select count(*) from cleanup_proof_publications where report_id='${id}'`)==='1');
  const pubId=pub[0],proofObjects=()=>sql(`select count(*) from storage.objects where bucket_id='Cleanup Proof' and name like '${id}/%'`);
  check('four reviewed copies exist in the private proof bucket',proofObjects()==='4');
  // --- After publication: protected vs public bytes ---
  const listing=await (await api(null,`${proof}/public`)).json();
  check('anonymous public listing shows 2+2 reviewed images, no storage paths or crew notes',listing.proof.id===pubId&&listing.proof.before_urls.length===2&&listing.proof.after_urls.length===2&&!JSON.stringify(listing).includes('.jpg')&&!JSON.stringify(listing).includes('Crew note'));
  const pb=[];for(const [slot,i] of [['before',0],['before',1],['after',0],['after',1]]){const r=await api(null,`${proof}/public/${pubId}/${slot}/${i}`);assert.equal(r.status(),200,`public ${slot} ${i}`);pb.push({r,buf:await r.body()});}
  check('public image 1 hides the reviewed region (black) while the original stays unredacted',isBlack(await pixel(pb[0].buf,0.6,0.6))&&isYellow(await pixel(origBuf,0.6,0.6)));
  check('public images without a hidden area keep their pixels; each slot image is distinct',isYellow(await pixel(pb[1].buf,0.6,0.6))&&isYellow(await pixel(pb[2].buf,0.6,0.6))&&new Set(pb.map(x=>x.buf.toString('base64'))).size===4);
  check('public bytes are fresh JPEGs without source metadata, nosniff',pb.every(x=>x.r.headers()['content-type'].includes('image/jpeg')&&x.r.headers()['x-content-type-options']==='nosniff'&&!x.buf.toString('latin1').includes(MARKER)));
  check('wrong proof id, out-of-range index and bad slot are refused',(await api(null,`${proof}/public/d0900000-0000-4000-8000-000000000009/before/0`)).status()===404&&(await api(null,`${proof}/public/${pubId}/before/2`)).status()===404&&(await api(null,`${proof}/public/${pubId}/original/0`)).status()===400);
  check('originals stay protected after publication',(await api(null,`${proof}/original/before/0`)).status()===401&&(await api(t.ownerA,`${proof}/original/before/0`)).status()===403&&(await storage(null,'Cleanup Originals',originalPath)).status()>=400);
  const reviewedPath=sql(`select before_paths->>0 from cleanup_proof_publications where report_id='${id}'`);
  for(const [who,tok] of [['anonymous',null],['report owner',t.ownerA],['other citizen',t.citizenB]])
   check(`${who} cannot read the private proof bucket directly`,(await storage(tok,'Cleanup Proof',reviewedPath)).status()>=400);
  // --- Retry safety ---
  const stale={version:source.version,fingerprint:source.fingerprint,publication_id:null,redactions:{before:[[],[]],after:[[],[]]},public_notes:'Retry',privacy_checked:true};
  const again=await api(t.officer,proof,{method:'POST',data:stale,headers:{'Content-Type':'application/json'}});
  check('repeating the original request is refused and creates no second publication or objects',again.status()===409&&sql(`select id from cleanup_proof_publications where report_id='${id}'`)===pubId&&proofObjects()==='4');
  const fresh=await (await api(t.officer,proof)).json();
  check('reloaded source carries the publication identity and existing notes',fresh.publication_id===pubId&&!!fresh.existing_public_notes);
  // --- Case record now includes the published proof (T08 follow-up) ---
  const cr=await (await api(t.officer,`/api/reports/${id}/case-record`)).json();
  check('incident case record references the published proof',cr.proof&&cr.proof.id===pubId&&!JSON.stringify(cr).includes('.jpg'));
  await page.screenshot({path:path.join(output,'after-publish.png'),fullPage:true});
  check('no page exceptions',errors.length===0);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({pubId,results},null,1));
  await context.close();
 }finally{await browser.close();}
}
main().then(()=>console.log(`ALL ${results.length} CHECKS PASSED`),e=>{console.error(e);process.exit(1);});
