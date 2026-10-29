"use client";
import {useEffect,useState} from 'react';
import {RequireRole} from '@/components/auth/RequireRole';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import MunicipalDecisionCards from '@/components/analytics/MunicipalDecisionCards';
import {fetchBarangayAnalytics} from '@/lib/api/barangay-analytics';
import {initialBarangayRange,analyticsCsv,sortBarangays,formatHours} from '@/lib/barangay-analytics.mjs';
import styles from './BarangayAnalytics.module.css';
const bands=[['backlog_under_1_day','Under 1 day'],['backlog_1_2_days','1–2 days'],['backlog_3_6_days','3–6 days'],['backlog_7_29_days','7–29 days'],['backlog_30_plus_days','30+ days']];
const number=value=>Number(value??0).toLocaleString('en-US');
const percent=value=>value==null?'—':`${value}%`;
function Bars({rows,label}) {
 const max=Math.max(1,...rows.map(r=>r.value));
 return <ol className={styles.bars} aria-label={label}>{rows.map(row=><li key={row.label}>
  <div><span>{row.label}</span><strong>{number(row.value)}</strong></div>
  <div className={styles.track} aria-hidden="true"><span style={{width:`${100*row.value/max}%`}} /></div>
 </li>)}</ol>;
}
export default function BarangayAnalyticsPage(){
 return <RequireRole allowedRoles={['officer','admin']}><Analytics /></RequireRole>;
}
function Analytics(){
 const [range,setRange]=useState(initialBarangayRange),[draft,setDraft]=useState(initialBarangayRange);
 const [loaded,setLoaded]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null);
 const [reload,setReload]=useState(0),[validation,setValidation]=useState(''),[selected,setSelected]=useState('all');
 const [search,setSearch]=useState(''),[sort,setSort]=useState('backlog_total'),[exportNotice,setExportNotice]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let current=true;
  async function load(){
   setLoading(true);setError(null);
   try {const data=await fetchBarangayAnalytics(range,controller.signal);if(current)setLoaded(data);}
   catch(failure){if(current){setError(failure.message);if([401,403].includes(failure.status))setLoaded(null);}}
   finally{if(current)setLoading(false);}
  }
  load();return()=>{current=false;controller.abort();};
 },[range,reload]);
 function apply(event){
  event.preventDefault();
  const index=value=>Number(value.slice(0,4))*12+Number(value.slice(5))-1;
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(draft.start)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(draft.end)||draft.start>draft.end||draft.end>initialBarangayRange().end||index(draft.end)-index(draft.start)>=24){setValidation('Choose 1–24 calendar months, ending no later than this month.');return;}
  setValidation('');setRange({...draft});setExportNotice('');
 }
 const changed=draft.start!==range.start||draft.end!==range.end;
 const canExport=!!loaded&&!loading&&!error&&!changed&&loaded.start_month===range.start&&loaded.end_month===range.end;
 function download(){
  if(!canExport)return;
  try {
  const url=URL.createObjectURL(new Blob([analyticsCsv(loaded)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`ecopin-barangays-${loaded.start_month}-${loaded.end_month}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportNotice('CSV download started. Check your browser downloads.');
  }catch {setExportNotice('The CSV could not download. Please try again.');}
 }
 const total=loaded?.total;
 const focus=loaded&&(selected==='all'?total:loaded.groups.find(g=>g.key===selected))||total;
 const rows=loaded?sortBarangays(loaded.groups.filter(g=>g.name.toLowerCase().includes(search.trim().toLowerCase())),sort):[];
 const unassigned=loaded?.groups.find(g=>g.key==='unassigned');
 return <div className={`workspace-page--flow ${styles.page}`}>
  <PageHeader title="Barangay operations" subtitle="Where reports accumulate, where review slows, and where cleanup capacity needs attention."
   breadcrumbs={[{label:'Dashboard',href:'/dashboard'},{label:'Barangay analytics'}]}>
   <Button variant="secondary" onClick={download} disabled={!canExport}>Download CSV</Button>
  </PageHeader>
  <form onSubmit={apply} className={styles.filters} aria-label="Analytics months" noValidate>
   <label>From month<input type="month" min="2000-01" max={initialBarangayRange().end} value={draft.start} onChange={e=>setDraft({...draft,start:e.target.value})} /></label>
   <label>Through month<input type="month" min="2000-01" max={initialBarangayRange().end} value={draft.end} onChange={e=>setDraft({...draft,end:e.target.value})} /></label>
   <Button type="submit">Apply months</Button><Button type="button" variant="secondary" disabled={loading} onClick={()=>setReload(x=>x+1)}>Refresh</Button>
   <p>Calendar months use Asia/Manila. Current backlog always covers all recorded months.</p>
   {changed&&<p>Month changes are not applied yet.</p>}{validation&&<p role="alert">{validation}</p>}
  </form>
  {loading&&<p role="status">{loaded?'Updating analytics; previous figures remain below.':'Loading all 30 barangays…'}</p>}
  {error&&<div role="alert" className={styles.notice}><h2>Analytics could not load</h2><p>{error}</p>{loaded&&<p>Stale figures from the last successful load remain below. Exports are paused.</p>}<Button variant="secondary" disabled={loading} onClick={()=>setReload(x=>x+1)}>Try again</Button></div>}
  {exportNotice&&<p role="status">{exportNotice}</p>}
  {loaded&&<>
   <p className={styles.scope}>Internal database · 30 official barangays + unassigned locations · {loaded.start_month} through {loaded.end_month}<br />Snapshot: {new Date(loaded.generated_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})} (Asia/Manila)</p>
   {loaded.end_month===initialBarangayRange().end&&<p className={styles.scope}>The current month is incomplete; use complete months for like-for-like comparisons.</p>}
   {total.report_count===0&&<p className={styles.notice}>No reports were created in the selected months. Current backlog and recorded resolution events remain visible.</p>}
   <dl className={styles.metrics}>
    {[
     ['Reports submitted',number(total.report_count),'Created in selected months; includes pending and rejected submissions.'],
     ['Verification processed',percent(total.verification_rate_percent),`${number(total.verified_count)} approved/rejected of ${number(total.report_count)} submissions. Includes automated verification.`],
     ['Open backlog now',number(total.backlog_total),'All recorded months; excludes resolved, closed, rejected and withdrawn work.'],
     ['Median resolution time',formatHours(total.median_resolution_hours),`${number(total.resolution_count)} valid SWMO resolution events in selected months; includes older submissions.`],
    ].map(([label,value,note])=><div className={styles.card} key={label}><dt>{label}</dt><dd className={styles.value}>{value}</dd><dd className={styles.muted}>{note}</dd></div>)}
   </dl>
   <details className={styles.notice} aria-label="Data coverage">
    <summary>Coverage: {number(unassigned?.report_count)} unassigned reports · {number(total.missing_resolution_count+total.invalid_resolution_count)} missing/invalid resolution times</summary>
    <p>{number(unassigned?.report_count)} of {number(total.report_count)} selected-period reports and {number(unassigned?.backlog_total)} currently open reports have unassigned locations. Border, outside and unreconciled locations are not forced into a barangay.</p>
    <p>{number(total.missing_resolution_count)} resolved reports lack a resolution timestamp; {number(total.invalid_resolution_count)} have invalid timestamps across stored history. These are excluded from duration statistics. {number(loaded.quality.excluded_creation_timestamps)} records with missing/future creation times are excluded.</p>
   </details>
   <MunicipalDecisionCards data={loaded} paused={loading||!!error||changed||loaded.start_month!==range.start||loaded.end_month!==range.end} />
   <section className={styles.card} aria-label="Area detail">
    <div className={styles.sectionHeader}><div><h2>Monthly demand and current workload</h2><p className={styles.muted}>Select an area to inspect its trend and backlog. All locations includes unassigned and outside-baseline reports.</p></div>
     <label>Trend area<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All locations</option>{loaded.groups.map(g=><option key={g.key} value={g.key}>{g.name}</option>)}</select></label>
    </div>
    <div className={styles.charts}>
     <section><h3>Monthly report volume · {focus.name}</h3><p className={styles.muted}>Number of reports created; zero months are shown.</p><Bars label="Monthly report counts" rows={focus.monthly.map(m=>({label:m.month,value:m.report_count}))} /></section>
     <section><h3>Backlog age now · {focus.name}</h3><p className={styles.muted}>Elapsed time since submission, across all months. {number(focus.backlog_total)} open reports.</p><Bars label="Current backlog age bands" rows={bands.map(([key,label])=>({label,value:focus[key]}))} /></section>
    </div>
    <div className={styles.duration}><strong>Resolution events · {focus.name}</strong><span>{number(focus.resolution_count)} samples</span><span>Median {formatHours(focus.median_resolution_hours)}</span><span>Average {formatHours(focus.average_resolution_hours)}</span><span>90th percentile {formatHours(focus.p90_resolution_hours)}</span></div>
   </section>
   <section className={styles.card} aria-label="Barangay comparison">
    <div className={styles.sectionHeader}><div><h2>Compare all barangays</h2><p className={styles.muted}>Reporting activity is not waste tonnage or population-adjusted incidence. Small samples need care.</p></div>
     <label>Find barangay<input type="search" value={search} onChange={e=>setSearch(e.target.value)} /></label>
     <label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="backlog_total">Current backlog</option><option value="report_count">Reports submitted</option><option value="pending_count">Awaiting verification</option><option value="median_resolution_hours">Median resolution time</option></select></label>
    </div>
    <p className={styles.muted}>{rows.length} of 31 areas shown · CSV includes all areas and monthly counts.</p>
    <div className={styles.tableScroll} role="region" aria-label="Barangay operational comparison" tabIndex={0}><table>
     <caption className="sr-only">Creation-period submissions and verification, current backlog, and resolution-period median.</caption>
     <thead><tr>{['Barangay','Submitted','Verification processed','Awaiting verification','Open now','Aged 7+ days','Median resolution','Samples'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
     <tbody>{rows.map(g=><tr key={g.key}><th scope="row">{g.name}{g.psgc_code&&<small>{g.psgc_code}</small>}</th><td>{number(g.report_count)}</td><td>{percent(g.verification_rate_percent)}<small>{number(g.verified_count)} / {number(g.report_count)}</small></td><td>{number(g.pending_count)}</td><td>{number(g.backlog_total)}</td><td>{number(g.backlog_7_29_days+g.backlog_30_plus_days)}</td><td>{formatHours(g.median_resolution_hours)}</td><td>{number(g.resolution_count)}</td></tr>)}</tbody>
    </table></div>{rows.length===0&&<p>No barangays match that name.</p>}
   </section>
   <details className={styles.card}><summary>How these figures are calculated</summary><p>Submission and verification totals use reports created in the selected Manila calendar months, with their current verification state. Verification processed means approved or rejected, including automated decisions; it does not measure officer review speed. Backlog uses the current open state across all history, not a reconstructed historical snapshot.</p><p>Resolution time runs from submission to the dedicated SWMO resolution timestamp, for currently resolved/closed reports with a resolution event in the selected months. Missing, negative and future timestamps are excluded; latest edit time and citizen closure are not substitutes. No samples means unavailable, not zero-hour performance. The 90th percentile is an interpolated duration below which 90% of recorded samples fall.</p><p>Only reconciled polygon assignments enter barangay totals. San Miguel is included; Ortigas Center is a district, not an additional barangay. Unknown-location counts remain visible in citywide totals.</p></details>
  </>}
 </div>;
}
