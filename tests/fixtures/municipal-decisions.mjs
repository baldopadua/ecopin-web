import {barangayFixture} from './barangay-analytics.mjs';
import {initialBarangayRange} from '../../lib/barangay-analytics.mjs';
export async function decisionFixture(){
 const data=await barangayFixture();
 const months=data.total.monthly.map(m=>m.month).filter(month=>month<initialBarangayRange().end).slice(-2);
 const area=data.groups.find(g=>g.psgc_code==='1381200015');
 for(const row of area.monthly){if(row.month===months[0])row.report_count=20;if(row.month===months[1])row.report_count=25;}
 area.report_count=area.monthly.reduce((n,m)=>n+m.report_count,0);area.pending_count=20;
 area.verified_count=area.report_count-area.pending_count;area.rejected_count=2;area.approved_count=area.verified_count-2;
 area.verification_rate_percent=Math.round(1000*area.verified_count/area.report_count)/10;
 Object.assign(area,{backlog_total:18,backlog_under_1_day:3,backlog_1_2_days:3,backlog_3_6_days:6,backlog_7_29_days:4,backlog_30_plus_days:2,
  resolution_count:12,median_resolution_hours:48,average_resolution_hours:55,p90_resolution_hours:96});
 for(const key of ['report_count','verified_count','approved_count','rejected_count','pending_count','backlog_total','backlog_under_1_day','backlog_1_2_days','backlog_3_6_days','backlog_7_29_days','backlog_30_plus_days','resolution_count','missing_resolution_count','invalid_resolution_count'])data.total[key]=data.groups.reduce((n,g)=>n+g[key],0);
 data.total.verification_rate_percent=Math.round(1000*data.total.verified_count/data.total.report_count)/10;
 data.total.monthly=data.total.monthly.map(m=>({month:m.month,report_count:data.groups.reduce((n,g)=>n+g.monthly.find(v=>v.month===m.month).report_count,0)}));
 area.trend={previous_count:20,current_count:25};
 for(const key of ['previous_count','current_count'])data.total.trend[key]=data.groups.reduce((n,g)=>n+g.trend[key],0);
 return data;
}
