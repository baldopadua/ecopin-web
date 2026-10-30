import {validateBarangayAnalytics} from './barangay-analytics.mjs';
import {DECISION_RULES} from './municipal-decisions.mjs';
export function previousExecutiveMonth(month){
 const i=Number(month.slice(0,4))*12+Number(month.slice(5))-2;
 return month==='2000-01'?month:`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`;
}
export function executiveFresh(stamp,now=Date.now()){
 const time=typeof stamp==='string'?Date.parse(stamp):NaN,age=Number(now)-time;
 return Number.isFinite(age)&&age>=-DECISION_RULES.futureToleranceMinutes*60000&&age<=DECISION_RULES.maxSnapshotHours*3600000;
}
export function validateExecutiveSnapshot(data,month){
 const fail=()=>{throw new Error('Executive analytics returned inconsistent periods or coverage. Reload before printing.');};
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||data?.version!=='barangay-executive-v1')fail();
 const a=validateBarangayAnalytics(data.monthly),b=validateBarangayAnalytics(data.comparison),previous=previousExecutiveMonth(month);
 if(a.start_month!==month||a.end_month!==month||b.start_month!==previous||b.end_month!==month||a.generated_at!==b.generated_at||a.generated_at!==data.generated_at)fail();
 const expected=previous===month?[month]:[previous,month];
 for(const d of [a,b]){
  const wanted=d===a?[month]:expected;
  if(new Set(d.groups.filter(g=>/^1381200(00[1-9]|0[12]\d|030)$/.test(g.psgc_code||'')).map(g=>g.psgc_code)).size!==30)fail();
  for(const g of [d.total,...d.groups])if(g.monthly.map(m=>m.month).join()!==wanted.join())fail();
 }
 for(const g of [a.total,...a.groups]){
  const other=[b.total,...b.groups].find(v=>v.key===g.key);
  if(!other||g.report_count!==other.monthly.find(m=>m.month===month)?.report_count||
   ['backlog_total','backlog_under_1_day','backlog_1_2_days','backlog_3_6_days','backlog_7_29_days','backlog_30_plus_days','missing_resolution_count','invalid_resolution_count'].some(k=>g[k]!==other[k]))fail();
 }
 return data;
}
export function executiveHotspots(data,now=Date.now()){
 if(!data||!executiveFresh(data.generated_at,now)||Date.parse(data.generated_at)-Date.parse(data.history_start)!==90*86400000||!Array.isArray(data.patterns)||data.patterns.length>1666||
  !Number.isFinite(data.params?.eps_meters)||!Number.isSafeInteger(data.params?.min_samples)||
  !['included_reports_90','eligible_reports_90','excluded_unreconciled_90','excluded_invalid_location_90'].every(k=>Number.isSafeInteger(data.quality?.[k])&&data.quality[k]>=0)||
  data.patterns.some(p=>!Array.isArray(p.barangays)||!Array.isArray(p.period_counts)||p.period_counts.length!==3||!p.period_counts.every(n=>Number.isSafeInteger(n)&&n>=0)||p.period_counts.reduce((n,v)=>n+v,0)!==p.report_count||!Number.isSafeInteger(p.active_weeks)||
   !Number.isFinite(p.center_lat)||!Number.isFinite(p.center_lng)||!['7d','30d','90d'].every(k=>Number.isSafeInteger(p.observed_counts?.[k])&&p.observed_counts[k]>=0)))return {status:'unavailable',data:null};
 return {status:'ready',data};
}
