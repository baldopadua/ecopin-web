export const operationsToday=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
export function validOperationsPeriod(from,through,now=new Date()){
 const valid=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
 return valid(from)&&valid(through)&&from<=through&&through<=operationsToday(now)&&(Date.parse(through)-Date.parse(from))/86400000<=365
}
export function operationsFresh(stamp,now=Date.now()){const age=Number(now)-Date.parse(stamp);return typeof stamp==='string'&&Number.isFinite(age)&&age>=-300000&&age<=86400000}
export function validateOperationsSummary(data,from,through){
 const lists=['tasks','assignments','waypoints','verified','obstacles']
 if(data?.version!=='crew-operations-v1'||data.timezone!=='Asia/Manila'||data.start_day!==from||data.end_day!==through||!Number.isFinite(Date.parse(data.generated_at))||
  !lists.every(k=>Array.isArray(data[k])&&data[k].every(row=>row&&typeof row==='object'))||lists.reduce((n,k)=>n+data[k].length,0)>1000||
  data.tasks.some(t=>typeof t.task_id!=='string'||!Array.isArray(t.current_accounts))||data.assignments.some(e=>typeof e.event_ref!=='string'||!Array.isArray(e.receipt_accounts))||
  data.waypoints.some(w=>typeof w.waypoint_id!=='string'||typeof w.completion_ref!=='string')||data.verified.some(v=>typeof v.source_matches!=='boolean')||
  data.obstacles.some(o=>!['access_block','outcome','task_failure'].includes(o.source)))throw new Error('Operations summary returned incomplete data. Reload before printing.')
 return data
}
