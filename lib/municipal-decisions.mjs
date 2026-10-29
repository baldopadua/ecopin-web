// Review heuristics, not dispatch approval or measured resource requirements.
export const DECISION_RULES=Object.freeze({
 version:'PDT-17.1',maxSnapshotHours:24,futureToleranceMinutes:5,
 growthPercent:25,minimumPreviousReports:8,minimumCurrentReports:10,minimumBacklog:10,
 maximumUnassignedPercent:20,agedBacklog:5,pendingReview:10,processedPercent:80,
 resolutionSamples:10,resolutionP90Hours:72,resolutionAgedBacklog:3,
});
const monthIndex=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?Number(value.slice(0,4))*12+Number(value.slice(5))-1:NaN;
const monthName=index=>`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;
function localMonth(date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit'}).formatToParts(date);
 return monthIndex(`${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`);
}
const count=value=>Number.isSafeInteger(value)&&value>=0;
const display=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:1});
const official=g=>typeof g?.psgc_code==='string'&&/^1381200\d{3}$/.test(g.psgc_code)&&Number(g.psgc_code.slice(-3))>=1&&Number(g.psgc_code.slice(-3))<=30;
function observations(group){
 if(!Array.isArray(group?.monthly))return null;
 const map=new Map();
 for(const row of group.monthly){if(!Number.isFinite(monthIndex(row.month))||!count(row.report_count)||map.has(row.month))return null;map.set(row.month,row.report_count);}
 return map;
}
const resourceFacts=[
 'Confirm current collection frequency and route ownership; this snapshot does not supply an existing weekly schedule.',
 'Confirm qualified crew availability, remaining shift time and existing assignments in dispatch planning.',
 'Confirm vehicle capacity, starting load, task load estimates, access, consent and safety clearance before committing work.',
];
export function buildMunicipalDecisions(data,{now=new Date()}={}){
 const result={ruleVersion:DECISION_RULES.version,status:'unavailable',generatedAt:data?.generated_at??null,cards:[],notices:[],comparison:null};
 const stamp=new Date(data?.generated_at),clock=new Date(now);
 if(!Number.isFinite(stamp.getTime())||!Number.isFinite(clock.getTime())||!Array.isArray(data?.groups)||!data.total){
  result.notices.push('A valid analytics snapshot is required. Refresh analytics.');return result;
 }
 const age=clock-stamp;
 if(age>DECISION_RULES.maxSnapshotHours*3600000){result.status='stale';result.notices.push('Snapshot is older than 24 hours. Refresh before using decision proposals.');return result;}
 if(age < -DECISION_RULES.futureToleranceMinutes*60000){result.status='future';result.notices.push('Snapshot time is ahead of the current clock. Check the clock and refresh.');return result;}
 const first=monthIndex(data.start_month),end=monthIndex(data.end_month);
 if(!Number.isFinite(first)||!Number.isFinite(end)||first>end){result.notices.push('The applied month range is unavailable. Refresh analytics.');return result;}
 result.status='ready';
 const latestComplete=Math.min(localMonth(stamp)-1,localMonth(clock)-1);
 const historical=end<latestComplete;
 if(historical)result.notices.push('Historical range: demand-growth and resolution-tail proposals are withheld. Current backlog and still-pending verification work can remain actionable.');
 const last=Math.min(end,latestComplete);
 if(last-1>=first)result.comparison={previous:monthName(last-1),current:monthName(last)};
 else result.notices.push('Growth proposals need two consecutive complete months in the applied range. Current-month partial counts are excluded.');
 const totals=observations(data.total),unassigned=observations(data.groups.find(g=>g.key==='unassigned'));
 const coveragePercent=month=>{
  const total=totals?.get(month),unknown=unassigned?.get(month);
  return count(total)&&total>0&&count(unknown)&&unknown<=total?100*(total-unknown)/total:null;
 };
 if(result.comparison){
  result.comparison.previousCoveragePercent=coveragePercent(result.comparison.previous);
  result.comparison.currentCoveragePercent=coveragePercent(result.comparison.current);
 }
 const coverageReady=result.comparison&&[result.comparison.previousCoveragePercent,result.comparison.currentCoveragePercent].every(value=>value!=null&&value>=100-DECISION_RULES.maximumUnassignedPercent);
 if(result.comparison&&!coverageReady)result.notices.push('Growth proposals are withheld: both comparison months need known location coverage of at least 80%. Other cards concern only recorded, reconciled cases.');
 for(const g of data.groups.filter(official)){
  const aged=count(g.backlog_total)&&count(g.backlog_7_29_days)&&count(g.backlog_30_plus_days)&&g.backlog_7_29_days+g.backlog_30_plus_days<=g.backlog_total?g.backlog_7_29_days+g.backlog_30_plus_days:null;
  const series=observations(g),previous=result.comparison&&series?.get(result.comparison.previous),current=result.comparison&&series?.get(result.comparison.current);
  const growth=count(previous)&&previous>0&&count(current)?100*(current-previous)/previous:null;
  const growthMatch=!historical&&coverageReady&&previous>=DECISION_RULES.minimumPreviousReports&&current>=DECISION_RULES.minimumCurrentReports&&growth>=DECISION_RULES.growthPercent&&count(g.backlog_total)&&g.backlog_total>=DECISION_RULES.minimumBacklog;
  const agedMatch=aged!=null&&aged>=DECISION_RULES.agedBacklog;
  const base={area:g.name,areaKey:g.psgc_code,snapshotAt:data.generated_at};
  if(growthMatch||agedMatch){
   const ruleId=growthMatch?'collection-growth':'aged-backlog';
   result.cards.push({...base,id:`${g.psgc_code}:resources`,type:'resources',ruleId,rank:growthMatch?1:2,magnitude:growthMatch?growth:aged,
    matchedRules:[...(growthMatch?['collection-growth']:[]),...(agedMatch?['aged-backlog']:[])],
    title:growthMatch?'Trial an additional collection visit':'Plan an aged-backlog clearance run',
    proposal:growthMatch
     ?'Propose one additional weekly collection visit for a four-week trial, and assess reallocating one qualified crew slot to support it.'
     :'Prepare a focused clearance run and assess reallocating one qualified crew slot. Size the final plan using actual task loads.',
    trigger:growthMatch?`Growth ≥${DECISION_RULES.growthPercent}%, previous month ≥${DECISION_RULES.minimumPreviousReports} reports, current month ≥${DECISION_RULES.minimumCurrentReports}, open backlog ≥${DECISION_RULES.minimumBacklog}, and ≥${100-DECISION_RULES.maximumUnassignedPercent}% location coverage in both complete months.`
     :`At least ${DECISION_RULES.agedBacklog} currently open reports are aged 7 days or more.`,
    measurements:{previousMonth:result.comparison?.previous??null,currentMonth:result.comparison?.current??null,previousCount:previous??null,currentCount:current??null,growthPercent:growth,backlog:g.backlog_total,agedBacklog:aged},
    evidence:[...(growthMatch?[`${result.comparison.previous}: ${display(previous)} submissions → ${result.comparison.current}: ${display(current)} (${display(growth)}% increase).`, `Location coverage: ${result.comparison.previous} ${display(result.comparison.previousCoveragePercent)}%; ${result.comparison.current} ${display(result.comparison.currentCoveragePercent)}%.`]:[]),`${display(g.backlog_total)} open cases now; ${aged==null?'age breakdown unavailable':`${display(aged)} aged 7+ days`}.`],
    missingFacts:resourceFacts,
    checks:['Verify that the reported demand is actionable; report counts include pending/rejected submissions and do not measure waste tonnage.',
     'Check reporting participation and boundary-reconciliation changes before attributing report growth to increased waste.',
     'Do not count this proposal as an additional crew allocation when both demand growth and aged backlog trigger it.',
     'Review backlog and observed service conditions after four weeks before retaining any frequency change.'],destination:'planning',
   });
  }
  const processed=count(g.report_count)&&g.report_count>0&&count(g.verified_count)&&count(g.pending_count)&&g.verified_count+g.pending_count===g.report_count?100*g.verified_count/g.report_count:null;
  if(count(g.pending_count)&&g.pending_count>=DECISION_RULES.pendingReview&&processed!=null&&processed<DECISION_RULES.processedPercent){
   result.cards.push({...base,id:`${g.psgc_code}:verification`,type:'verification',ruleId:'verification-queue',matchedRules:['verification-queue'],rank:3,magnitude:g.pending_count,
    title:'Schedule an extra verification session',proposal:'Schedule a dedicated review session for the pending cohort before requesting more field resources.',
    trigger:`At least ${DECISION_RULES.pendingReview} selected-period submissions await verification, and fewer than ${DECISION_RULES.processedPercent}% have been approved or rejected.`,
    measurements:{pending:g.pending_count,processedPercent:processed,processed:g.verified_count,submitted:g.report_count},
    evidence:[`${display(g.pending_count)} pending submissions from ${data.start_month} through ${data.end_month}.`,`${display(g.verified_count)} / ${display(g.report_count)} processed (${display(processed)}%).`],
    missingFacts:['Inspect pending AI/manual-review reasons; the analytics does not identify reviewer availability or required staff hours.'],
    checks:['Processed includes automated decisions. This is not a measurement of officer review speed.'],destination:'reports',
   });
  }
  if(!historical&&count(g.resolution_count)&&g.resolution_count>=DECISION_RULES.resolutionSamples&&Number.isFinite(g.p90_resolution_hours)&&g.p90_resolution_hours>=DECISION_RULES.resolutionP90Hours&&aged!=null&&aged>=DECISION_RULES.resolutionAgedBacklog){
   result.cards.push({...base,id:`${g.psgc_code}:resolution`,type:'resolution',ruleId:'resolution-tail',matchedRules:['resolution-tail'],rank:4,magnitude:g.p90_resolution_hours,
    title:'Review recurring resolution blockers',proposal:'Review delayed cases for access, routing and coordination blockers before committing additional trucks or crews.',
    trigger:`At least ${DECISION_RULES.resolutionSamples} valid resolution samples, 90th-percentile duration ≥${DECISION_RULES.resolutionP90Hours} hours, and at least ${DECISION_RULES.resolutionAgedBacklog} open cases aged 7+ days.`,
    measurements:{samples:g.resolution_count,p90Hours:g.p90_resolution_hours,agedBacklog:aged},
    evidence:[`${display(g.resolution_count)} valid SWMO resolution events; 90th percentile ${display(g.p90_resolution_hours)} hours.`,`${display(aged)} current cases aged 7+ days.`],
    missingFacts:['Review case mix and actual blockers. Resolution events and the current backlog are different cohorts.'],
    checks:['72 hours is a draft planning trigger, not the configured service deadline or evidence of an SLA breach.'],destination:'reports',
   });
  }
 }
 result.cards.sort((a,b)=>a.rank-b.rank||b.magnitude-a.magnitude||a.area.localeCompare(b.area)||a.id.localeCompare(b.id));
 return result;
}
