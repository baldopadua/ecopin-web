const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const count=n=>Number.isSafeInteger(n)&&n>=0;
export function validateUnprocessedAlerts(data){
 const fail=()=>{throw new Error('Incident alerts returned incomplete data. Refresh to retry.');};
 const stamp=Date.parse(data?.generated_at);
 if(data?.version!=='unprocessed-alerts-v1'||!Number.isFinite(stamp)||!Array.isArray(data.reports)||data.reports.length>100||
  ![data.total,data.overdue_count,data.approaching_count].every(count)||data.total!==data.overdue_count+data.approaching_count||data.reports.length>data.total)fail();
 // Postgres retains microseconds; browser Date parsing truncates to milliseconds.
 for(const r of data.reports){
  const created=Date.parse(r?.created_at);
  if(!uuid.test(r?.report_id)||!Number.isFinite(created)||!count(r.age_days)||r.age_days<4||
   (stamp-created<r.age_days*86400000-1||stamp-created>=(r.age_days+1)*86400000+1)||r.state!==(r.age_days>=5?'overdue':'approaching')||
   typeof r.missing_acknowledgement!=='boolean'||typeof r.missing_assignment!=='boolean'||(!r.missing_acknowledgement&&!r.missing_assignment))fail();
 }
 if(new Set(data.reports.map(r=>r.report_id)).size!==data.reports.length)fail();
 if(data.next_cursor!==null&&(!data.next_cursor||!data.reports.length||
  data.next_cursor.report_id!==data.reports.at(-1).report_id||data.next_cursor.created_at!==data.reports.at(-1).created_at))fail();
 return data;
}
export function unprocessedReason(report){return [report.missing_acknowledgement?'acknowledgement':null,report.missing_assignment?'crew assignment':null].filter(Boolean).join(' and ');}
