import {trendPeriods} from '../../lib/barangay-trends.mjs';
import {decisionFixture} from './municipal-decisions.mjs';
export async function executiveFixture(month){
 const original=await decisionFixture();month??=original.total.monthly.at(-2).month;
 const index=Number(month.slice(0,4))*12+Number(month.slice(5))-2,previous=`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;
 function subset(months){const d=structuredClone(original);d.start_month=months[0];d.end_month=months.at(-1);d.trend_periods=trendPeriods(d.start_month,d.end_month,d.generated_at);
  if(!d.trend_periods)for(const g of [d.total,...d.groups])g.trend=null;
  for(const g of d.groups){g.monthly=months.map(month=>({month,report_count:g.monthly.find(m=>m.month===month)?.report_count??0}));g.report_count=g.monthly.reduce((n,m)=>n+m.report_count,0);g.pending_count=Math.min(g.pending_count,g.report_count);g.verified_count=g.report_count-g.pending_count;g.rejected_count=Math.min(g.rejected_count,g.verified_count);g.approved_count=g.verified_count-g.rejected_count;g.verification_rate_percent=g.report_count?Math.round(1000*g.verified_count/g.report_count)/10:null;}
  for(const k of ['report_count','verified_count','approved_count','rejected_count','pending_count'])d.total[k]=d.groups.reduce((n,g)=>n+g[k],0);
  d.total.verification_rate_percent=d.total.report_count?Math.round(1000*d.total.verified_count/d.total.report_count)/10:null;
  d.total.monthly=months.map(month=>({month,report_count:d.groups.reduce((n,g)=>n+g.monthly.find(m=>m.month===month).report_count,0)}));return d;
 }
 return {version:'barangay-executive-v1',generated_at:original.generated_at,monthly:subset([month]),comparison:subset([previous,month])};
}
