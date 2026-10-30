const day=86400000;
const monthIndex=v=>typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(v)?Number(v.slice(0,4))*12+Number(v.slice(5))-1:NaN;
const monthString=n=>`${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;
export function trendPeriods(start,end,stamp){
 const date=new Date(stamp);if(!Number.isFinite(date.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit'}).formatToParts(date);
 const latest=monthIndex(`${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`)-1;
 const first=monthIndex(start),last=Math.min(monthIndex(end),latest);
 if(!Number.isFinite(first)||!Number.isFinite(last)||last<first)return null;
 const until=Date.UTC(Math.floor((last+1)/12),(last+1)%12,1);
 const iso=n=>new Date(n).toISOString().slice(0,10);
 return {days:30,anchor_month:monthString(last),previous_start:iso(until-60*day),previous_end:iso(until-30*day),current_start:iso(until-30*day),current_end:iso(until)};
}
export function trendSummary(previous,current){
 if(![previous,current].every(n=>Number.isSafeInteger(n)&&n>=0))return null;
 const percent=previous===0?null:100*(current-previous)/previous;
 return {previous,current,percent,label:previous===0?(current===0?'No activity':'New Activity'):`${percent>0?'+':''}${Number(percent.toFixed(1))}%`,smallSample:previous<8||current<10};
}
export function comparableTrend(data){
 const expected=trendPeriods(data?.start_month,data?.end_month,data?.generated_at);
 if(!expected||!data?.trend_periods||Object.keys(expected).some(k=>data.trend_periods[k]!==expected[k]))return null;
 const rows=[data.total,...(data.groups||[])];
 if(rows.some(g=>!trendSummary(g?.trend?.previous_count,g?.trend?.current_count)))return null;
 if(['previous_count','current_count'].some(k=>data.groups.reduce((n,g)=>n+g.trend[k],0)!==data.total.trend[k]))return null;
 return expected;
}
export const trendPeriodLabel=p=>p?`${p.previous_start} to ${p.previous_end} vs ${p.current_start} to ${p.current_end} (end dates excluded; Manila; 30 days each)`:'Comparable trend unavailable';
