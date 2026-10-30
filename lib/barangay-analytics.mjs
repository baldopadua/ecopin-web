import {comparableTrend,trendSummary,trendPeriodLabel} from './barangay-trends.mjs';
import {buildMunicipalDecisions} from './municipal-decisions.mjs';
export function initialBarangayRange(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit'}).formatToParts(now);
 const end=`${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;
 const index=Number(end.slice(0,4))*12+Number(end.slice(5))-6;
 return {start:`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`,end};
}
export const formatHours=value=>value==null||!Number.isFinite(Number(value))?'—':`${Number(value).toLocaleString('en-US',{maximumFractionDigits:1})} h`;
export function sortBarangays(groups,metric) {
 return [...groups].sort((a,b)=>Number(b[metric]??-1)-Number(a[metric]??-1)||a.name.localeCompare(b.name));
}
const csvCell=value=>{
 let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
};
export function analyticsCsv(data) {
 const groups=[...(data.total?[data.total]:[]),...data.groups];
 const lines=[['EcoPin barangay operational analytics'],['Calendar months',data.start_month,data.end_month,'Asia/Manila'],['Snapshot generated',data.generated_at],
 ['Scope','Creation-cohort report counts and verification; current all-time backlog; resolution events in selected months'],
 ['Barangay','PSGC','Reports submitted','Verification processed','Approved','Rejected','Awaiting verification','Verification processed %','Current backlog','Under 1 day','1–2 days','3–6 days','7–29 days','30+ days','Resolution samples','Median hours','Average hours','P90 hours','Missing resolution timestamp (all history)','Invalid resolution timestamp (all history)']];
 for(const g of groups)lines.push([g.name,g.psgc_code,g.report_count,g.verified_count,g.approved_count,g.rejected_count,g.pending_count,g.verification_rate_percent,g.backlog_total,g.backlog_under_1_day,g.backlog_1_2_days,g.backlog_3_6_days,g.backlog_7_29_days,g.backlog_30_plus_days,g.resolution_count,g.median_resolution_hours,g.average_resolution_hours,g.p90_resolution_hours,g.missing_resolution_count,g.invalid_resolution_count]);
 lines.push([],['Monthly report counts'],['Barangay','Month (Asia/Manila)','Reports submitted']);
 for(const g of groups)for(const m of g.monthly)lines.push([g.name,m.month,m.report_count]);
 const periods=comparableTrend(data);
 lines.push([],['Equal-period submission trends',trendPeriodLabel(periods)],['Barangay','Previous 30 days','Current 30 days','Change','Small sample']);
 for(const g of groups){const t=periods&&trendSummary(g.trend.previous_count,g.trend.current_count);lines.push([g.name,t?.previous,t?.current,t?.label??'Unavailable',t?(t.smallSample?'Yes':'No'):'']);}
 const decisions=buildMunicipalDecisions(data);
 lines.push([],['Municipal decision proposals'],['Rule policy',decisions.ruleVersion],['Decision status',decisions.status],['Notices',decisions.notices.join(' ')],['Barangay','Rule ID','Matched rules','Proposal','Observed evidence','Trigger','Confirm before acting','Snapshot']);
 for(const card of decisions.cards)lines.push([card.area,card.ruleId,card.matchedRules.join('; '),card.proposal,card.evidence.join(' '),card.trigger,[...card.missingFacts,...card.checks].join(' '),card.snapshotAt]);
 return '\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

export function validateBarangayAnalytics(data) {
 const counts=['report_count','verified_count','approved_count','rejected_count','pending_count','backlog_total','backlog_under_1_day','backlog_1_2_days','backlog_3_6_days','backlog_7_29_days','backlog_30_plus_days','resolution_count','missing_resolution_count','invalid_resolution_count'];
 const rows=[data?.total,...(data?.groups??[])];
 const validRow=g=>g&&typeof g.name==='string'&&counts.every(k=>Number.isSafeInteger(g[k])&&g[k]>=0)&&
  g.verified_count===g.approved_count+g.rejected_count&&g.report_count===g.verified_count+g.pending_count&&
  g.backlog_total===g.backlog_under_1_day+g.backlog_1_2_days+g.backlog_3_6_days+g.backlog_7_29_days+g.backlog_30_plus_days&&
  ['median_resolution_hours','average_resolution_hours','p90_resolution_hours'].every(k=>g.resolution_count===0?g[k]===null:typeof g[k]==='number'&&Number.isFinite(g[k])&&g[k]>=0)&&
  (g.report_count===0?g.verification_rate_percent===null:typeof g.verification_rate_percent==='number'&&g.verification_rate_percent>=0&&g.verification_rate_percent<=100)&&
  Array.isArray(g.monthly)&&g.monthly.length>0&&g.monthly.length<=24&&g.monthly.every(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m.month)&&Number.isSafeInteger(m.report_count)&&m.report_count>=0)&&
  g.monthly.reduce((n,m)=>n+m.report_count,0)===g.report_count;
 if(data?.timezone!=='Asia/Manila'||!Number.isFinite(Date.parse(data?.generated_at))||!Array.isArray(data.groups)||data.groups.length!==31||
  new Set(data.groups.map(g=>g?.key)).size!==31||data.groups.filter(g=>g.psgc_code).length!==30||!data.groups.some(g=>g.key==='unassigned')||
  !rows.every(validRow)||!Number.isSafeInteger(data.quality?.excluded_creation_timestamps)||data.quality.excluded_creation_timestamps<0||
  !counts.every(k=>data.groups.reduce((n,g)=>n+g[k],0)===data.total[k]))throw new Error('Analytics returned incomplete or inconsistent coverage. Please retry.');
 return data;
}
