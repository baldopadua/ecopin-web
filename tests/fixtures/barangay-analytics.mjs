import {trendPeriods} from '../../lib/barangay-trends.mjs';
import {readFile} from 'node:fs/promises';
import {initialBarangayRange} from '../../lib/barangay-analytics.mjs';
export async function barangayFixture(){
 const roster=JSON.parse(await readFile(new URL('./pasig-roster.json',import.meta.url),'utf8')).barangays;
 const range=initialBarangayRange();const first=Number(range.start.slice(0,4))*12+Number(range.start.slice(5))-1;
 const months=Array.from({length:6},(_,i)=>`${Math.floor((first+i)/12)}-${String((first+i)%12+1).padStart(2,'0')}`);
 const groups=[...roster,{name:'Unassigned location',psgc_code:null}].map((r,i)=>{
  const count=i===30?6:8+(i%4)*4,verified=Math.floor(count*.75),bands=[i%3,1,i%2,i%4,i%5];
  const n=i%5,median=n?8+i*3:null;
  return {key:r.psgc_code||'unassigned',name:r.name,psgc_code:r.psgc_code,report_count:count,verified_count:verified,approved_count:verified-1,rejected_count:1,pending_count:count-verified,verification_rate_percent:Math.round(1000*verified/count)/10,
   backlog_total:bands.reduce((a,b)=>a+b,0),backlog_under_1_day:bands[0],backlog_1_2_days:bands[1],backlog_3_6_days:bands[2],backlog_7_29_days:bands[3],backlog_30_plus_days:bands[4],resolution_count:n,median_resolution_hours:median,average_resolution_hours:median,p90_resolution_hours:median==null?null:median*(n===1?1:1.2),missing_resolution_count:i===1?2:0,invalid_resolution_count:i===2?1:0,
   monthly:months.map((month,j)=>({month,report_count:Math.floor(count/6)+(j<count%6?1:0)}))};
 });
 const total={key:'all',name:'All locations',psgc_code:null};
 for(const key of Object.keys(groups[0]))if(Number.isInteger(groups[0][key])&&!['verification_rate_percent','median_resolution_hours','average_resolution_hours','p90_resolution_hours'].includes(key))total[key]=groups.reduce((n,g)=>n+g[key],0);
 total.verification_rate_percent=Math.round(1000*total.verified_count/total.report_count)/10;
 total.median_resolution_hours=38;total.average_resolution_hours=42;total.p90_resolution_hours=83;
 total.monthly=months.map((month,j)=>({month,report_count:groups.reduce((n,g)=>n+g.monthly[j].report_count,0)}));
 for(const [i,g] of groups.entries())g.trend={previous_count:i===0?0:10,current_count:i===0?5:12};
 total.trend={previous_count:groups.reduce((n,g)=>n+g.trend.previous_count,0),current_count:groups.reduce((n,g)=>n+g.trend.current_count,0)};
 return {trend_periods:trendPeriods(range.start,range.end,new Date()),generated_at:new Date().toISOString(),timezone:'Asia/Manila',start_month:range.start,end_month:range.end,total,groups,quality:{excluded_creation_timestamps:0}};
}
