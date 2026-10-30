'use client'
import {useEffect,useState} from 'react'
import {flushSync} from 'react-dom'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import A4PrintPortal from '@/components/print/A4PrintPortal'
import {fetchExecutiveAnalytics} from '@/lib/api/barangay-executive'
import {getHistoricalPatterns} from '@/lib/api/hotspot'
import {executiveFresh,executiveHotspots} from '@/lib/barangay-executive.mjs'
import {buildMunicipalDecisions} from '@/lib/municipal-decisions.mjs'
import {initialBarangayRange,formatHours,unassignedReasonsText} from '@/lib/barangay-analytics.mjs'
import {patternLabel} from '@/lib/historical-patterns.mjs'
import {caseTime} from '@/lib/incident-case-record.mjs'
import styles from './BarangayExecutiveReport.module.css'
import {comparableTrend,trendSummary,trendPeriodLabel} from '@/lib/barangay-trends.mjs'
const number=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:1})
const pct=value=>value==null?'No submissions':`${number(value)}%`
const age=g=>g.backlog_7_29_days+g.backlog_30_plus_days
function ReportTable({caption,columns,rows}){return <table><caption>{caption}</caption><thead><tr>{columns.map(c=><th key={c[0]} scope="col">{c[0]}</th>)}</tr></thead><tbody>{rows.map(g=><tr key={g.key}>{columns.map(([name,value],i)=>i===0?<th scope="row" key={name}>{value(g)}</th>:<td key={name}>{value(g)}</td>)}</tr>)}</tbody></table>}
function ExecutiveSheet({data,hotspots,month,clock}){
 const monthly=data.monthly,total=monthly.total,unknown=monthly.groups.find(g=>g.key==='unassigned'),rows=[total,...monthly.groups]
 const decisions=buildMunicipalDecisions(data.comparison,{now:new Date(clock)})
 const resources=decisions.cards.filter(c=>c.type==='resources')
 const sharedChecks=resources.length<2?[]:[...resources[0].missingFacts,...resources[0].checks].filter(value=>resources.every(c=>[...c.missingFacts,...c.checks].includes(value)))
 const partial=month>=initialBarangayRange(new Date(data.generated_at)).end||month>=initialBarangayRange(new Date(clock)).end
 const context=executiveHotspots(hotspots,clock)
 const top=[...monthly.groups].filter(g=>g.psgc_code).sort((a,b)=>b.backlog_total-a.backlog_total||a.name.localeCompare(b.name)).slice(0,5)
 return <article aria-label="Monthly barangay executive report" className={styles.sheet}>
  <header className={styles.masthead}><p>ECOPIN / PASIG CITY / SWMO</p><h1>Monthly barangay executive summary</h1><p>For the Office of the City Mayor and City Council</p><p><strong>Report month: {month}{partial?' · MONTH TO DATE — INCOMPLETE':''}</strong></p><p>Statistics snapshot: {caseTime(data.generated_at)} · Manila (UTC+8)</p></header>
  <section><h2>Executive overview</h2><p>{number(total.report_count)} citizen reports were submitted in {month}; {number(total.verified_count)} have a processed verification outcome ({pct(total.verification_rate_percent)}). The current open workload is {number(total.backlog_total)} reports across all recorded months, including {number(age(total))} aged seven days or more.</p>
   <dl className={styles.metrics}><div><dt>Submitted in month</dt><dd>{number(total.report_count)}</dd></div><div><dt>Awaiting verification</dt><dd>{number(total.pending_count)}</dd></div><div><dt>Current backlog</dt><dd>{number(total.backlog_total)}</dd></div><div><dt>Median resolution</dt><dd>{formatHours(total.median_resolution_hours)}</dd></div></dl>
   <p>Resolution events in {month}: {number(total.resolution_count)} valid samples · Average {formatHours(total.average_resolution_hours)} · 90th percentile {formatHours(total.p90_resolution_hours)}. No samples means unavailable, not zero-hour performance.</p>
   <p>Coverage: all 30 official barangays and a separate unassigned bucket. Unassigned locations account for {number(unknown.report_count)} monthly submissions and {number(unknown.backlog_total)} open reports. {unassignedReasonsText(monthly.quality)} Missing/future submission times excluded across stored history: {number(monthly.quality.excluded_creation_timestamps)}. Missing / invalid resolution times across stored history: {number(total.missing_resolution_count)} / {number(total.invalid_resolution_count)}.</p>
   <h3>Largest current recorded backlogs</h3><ol className={styles.priorities}>{top.map(g=><li key={g.key}><strong>{g.name}</strong>: {number(g.backlog_total)} open; {number(age(g))} aged 7+ days.</li>)}</ol>
   <p className={styles.note}>Counts cover all EcoPin concern types. They measure reporting activity, not waste tonnage, population-adjusted incidence or a causal service-performance score. Backlog is current at the snapshot, not month-end historical backlog.</p>
  </section>
  <section className={styles.decisions}><h2>Decision-support recommendations</h2><p>Draft rule policy {decisions.ruleVersion}. Proposal inputs cover {data.comparison.start_month} through {data.comparison.end_month}; monthly executive statistics above cover {month} only. Current workload uses the same database snapshot. Proposals do not allocate crews or change collection schedules.</p>
   {decisions.comparison&&<p>Demand comparison: {trendPeriodLabel(decisions.comparison)}.</p>}
   {decisions.notices.map(notice=><p key={notice} className={styles.note}>{notice}</p>)}
   {decisions.status!=='ready'?<p>Recommendation evidence is unavailable; refresh before using proposals.</p>:!decisions.cards.length?<p>No decision rule matched this snapshot. Ordinary report and dispatch queues still require review.</p>:<>
    <p>{decisions.cards.length} proposals across all official barangays. Dashboard area/type filters and collapsed cards do not limit this report.</p>
    {sharedChecks.length>0&&<div className={styles.sharedChecks}><h3>Shared checks for collection / crew proposals</h3><ul>{sharedChecks.map(value=><li key={value}>{value}</li>)}</ul></div>}
    <table><caption>All matched planning proposals and their evidence</caption><thead><tr><th>Area / proposed action</th><th>Observed evidence / rule</th><th>Confirm before acting</th></tr></thead><tbody>{decisions.cards.map(c=><tr key={c.id}>
     <td><strong>{c.area} · {c.title}</strong><p>{c.proposal}</p></td><td><ul>{c.evidence.map((v,i)=><li key={i}>{v}</li>)}</ul><p>Rule {c.ruleId} · Matched: {c.matchedRules.join(', ')}.</p><p>{c.trigger}</p></td><td>{c.type==='resources'&&sharedChecks.length>0&&<p>Apply the shared collection / crew checks above.</p>}<ul>{[...c.missingFacts,...c.checks].filter(v=>c.type!=='resources'||!sharedChecks.includes(v)).map((v,i)=><li key={i}>{v}</li>)}</ul></td>
    </tr>)}</tbody></table>
   </>}
  </section>
  <section><h2>Recurring hotspot planning context</h2><p>This is the latest available rolling 90-day DBSCAN analysis, a separate snapshot from the report month. It is not a reconstruction of {month}, a forecast of future waste corridors or an identified road segment.</p>
   {context.status!=='ready'?<p>Hotspot analysis unavailable, incomplete or older than 24 hours. No hotspot count is inferred. Refresh the report to retry; monthly statistics remain available.</p>:<>
    <p>Analysis: {caseTime(hotspots.generated_at)} (Manila). Observed window: {caseTime(hotspots.history_start)} through {caseTime(hotspots.generated_at)}. Separate 30-day period bins and active weeks use UTC.</p>
    <p>DBSCAN neighborhood {number(hotspots.params.eps_meters)} m; minimum {number(hotspots.params.min_samples)} reports. {number(hotspots.quality.included_reports_90)} of {number(hotspots.quality.eligible_reports_90)} eligible reports included; exclusions: {number(hotspots.quality.excluded_unreconciled_90)} unresolved/border assignments and {number(hotspots.quality.excluded_invalid_location_90)} invalid locations. Approved, reconciled reports only; totals differ from the all-submission statistics.</p>
    {!hotspots.patterns.length?<p>No 90-day density concentrations were observed. This does not establish that waste risk is absent.</p>:<table><caption>All observed 90-day concentrations; recurrence distinguished from spikes</caption><thead><tr><th>Pattern / location</th><th>Recurrence evidence</th><th>Planning interpretation</th></tr></thead><tbody>{hotspots.patterns.map(p=><tr key={p.id}>
     <td><strong>{patternLabel(p.pattern)}</strong><p>{p.barangays.map(b=>`${b.name}: ${b.report_count}`).join(' / ')}</p><p>Center: {p.center_lat.toFixed(6)}, {p.center_lng.toFixed(6)} (inspection candidate)</p><small>{p.id}</small></td>
     <td>{number(p.report_count)} reports in 90 days · {number(p.active_weeks)} active UTC weeks.<p>Oldest / middle / latest 30 days: {p.period_counts.join(' / ')}.</p><p>Past 7 / 30 / 90 days: {['7d','30d','90d'].map(k=>p.observed_counts[k]).join(' / ')}.</p></td>
     <td>{p.pattern==='chronic'?'Inspect recurring concentrations and check collection coverage before proposing a scheduled trial.':p.pattern==='transient_spike'?'Check whether the temporary cause has ended before committing permanent resources.':'Verify current conditions and monitor another reporting period before changing permanent coverage.'}</td>
    </tr>)}</tbody></table>}
    <p className={styles.note}>Chronic candidates require at least three reports in each non-overlapping 30-day period and six active UTC weeks. Transient spikes have at least six middle-period reports and at most two in each adjacent period. These are observation rules, not causal or statistical significance tests; field inspection is still required.</p>
   </>}
  </section>
  <section className={styles.appendix}><h2>Complete barangay statistics</h2><p>All 30 official barangays, unassigned locations and the citywide total. San Miguel is included. Ortigas Center is a commercial district, not an additional barangay. No dashboard search or area filter is applied.</p>
   <ReportTable caption={`Submissions and current verification state · ${month}`} rows={rows} columns={[
    ['Area',g=>g.name],['Submitted',g=>number(g.report_count)],['Approved',g=>number(g.approved_count)],['Rejected',g=>number(g.rejected_count)],['Pending',g=>number(g.pending_count)],['Processed',g=>`${number(g.verified_count)} / ${number(g.report_count)} (${pct(g.verification_rate_percent)})`],
   ]} />
   <ReportTable caption={`Equal 30-day submission trends · ${trendPeriodLabel(comparableTrend(monthly))}`} rows={rows} columns={[
    ['Area',g=>g.name],['Previous 30 days',g=>comparableTrend(monthly)?number(g.trend.previous_count):'Unavailable'],['Current 30 days',g=>comparableTrend(monthly)?number(g.trend.current_count):'Unavailable'],['Change',g=>{const t=comparableTrend(monthly)&&trendSummary(g.trend.previous_count,g.trend.current_count);return t?`${t.label}${t.smallSample?' · Small sample':''}`:'Unavailable'}],
   ]} />
   <p>Trend windows end at the latest complete month in the applied range and can extend before it. Zero baseline with reports means New Activity; no reports in either window means No activity. Counts measure reporting activity, not waste volume.</p>
   <p>Processed means approved or rejected, including automated verification. This does not measure officer review speed.</p>
   <ReportTable caption="Current all-time backlog by elapsed age at the snapshot" rows={rows} columns={[
    ['Area',g=>g.name],['Open',g=>number(g.backlog_total)],['Under 1 day',g=>number(g.backlog_under_1_day)],['1–2 days',g=>number(g.backlog_1_2_days)],['3–6 days',g=>number(g.backlog_3_6_days)],['7–29 days',g=>number(g.backlog_7_29_days)],['30+ days',g=>number(g.backlog_30_plus_days)],
   ]} />
   <ReportTable caption={`SWMO resolution events in ${month} · duration in hours`} rows={rows} columns={[
    ['Area',g=>g.name],['Samples',g=>number(g.resolution_count)],['Median',g=>formatHours(g.median_resolution_hours)],['Average',g=>formatHours(g.average_resolution_hours)],['P90',g=>formatHours(g.p90_resolution_hours)],['Missing time*',g=>number(g.missing_resolution_count)],['Invalid time*',g=>number(g.invalid_resolution_count)],
   ]} />
   <p>* Missing and invalid timestamp counts cover stored history, not just this month. Duration uses submission to dedicated SWMO resolution time for currently resolved/closed reports with a resolution event in the selected month, including older submissions. Missing, negative and future timestamps are excluded; updated_at and citizen closure are not substitutes.</p>
  </section>
  <section><h2>Interpretation and follow-up</h2><p>Boundary reconciliation and reporting participation affect observed counts. Border, outside and unresolved assignments stay unassigned. Review actual route ownership, truck loads, crew availability, access and safety before acting on draft recommendations. Evaluate any collection-frequency trial against later observed conditions; the report does not establish measured staffing requirements or predict the effect of a schedule change.</p><p>Sources: internal database analytics, rule-based municipal proposals and a separately timestamped historical spatial analysis. This report contains aggregates, not citizen identities or individual evidence photos.</p></section>
 </article>
}
export default function BarangayExecutiveReport({month}){return <ReportSession key={month} month={month} />}
function ReportSession({month}){
 const router=useRouter(),[draft,setDraft]=useState(month),[attempt,setAttempt]=useState(0),[resource,setResource]=useState(null),[clock,setClock]=useState(()=>Date.now()),[printing,setPrinting]=useState(false)
 const key=`${month}:${attempt}`
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer)},[])
 useEffect(()=>{const controller=new AbortController();async function load(){
  const [stats,patterns]=await Promise.allSettled([fetchExecutiveAnalytics(month,controller.signal),getHistoricalPatterns({signal:controller.signal,refresh:attempt>0})])
  if(controller.signal.aborted)return
  setClock(Date.now());setResource(stats.status==='fulfilled'?{key,data:stats.value,hotspots:patterns.status==='fulfilled'?patterns.value:null}:{key,error:stats.reason?.message||'Executive report could not load.'})
 }load();return()=>controller.abort()},[month,attempt,key])
 const current=resource?.key===key?resource:null,data=current?.data,changed=draft!==month
 const ready=!!data&&executiveFresh(data.generated_at,clock)&&!changed
 async function print(){const now=Date.now();setClock(now);if(!data||changed||!executiveFresh(data.generated_at,now)||printing)return;setPrinting(true);try{await document.fonts.ready;if(executiveFresh(data.generated_at,Date.now())){flushSync(()=>setClock(Date.now()));window.print()}else setClock(Date.now())}finally{setPrinting(false)}}
 const sheet=data&&<ExecutiveSheet data={data} hotspots={current.hotspots} month={month} clock={clock} />
 return <div className={`workspace-page workspace-page--flow ${styles.preview}`}>
  <div className={styles.controls}><Link href="/dashboard/officer/metrics?tab=barangay" className="btn-secondary">Back to barangay analytics</Link><button type="button" className="btn-primary" disabled={!ready||printing} onClick={print}>{printing?'Preparing print…':'Print / Save PDF'}</button><button type="button" className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reload report</button>
   <form onSubmit={e=>{e.preventDefault();router.push(`/dashboard/officer/metrics/barangay-print/${encodeURIComponent(draft)}`)}}><label>Report month<input type="month" min="2000-01" max={initialBarangayRange().end} required value={draft} onChange={e=>setDraft(e.target.value)} /></label><button type="submit" className="btn-secondary">Apply report month</button></form>
   <p>A4 portrait. Choose “Save as PDF” in the print dialog and turn off browser-added headers and footers. Every barangay and matched recommendation is included; long tables continue across pages.</p>
   {changed&&<p role="status">Apply the report month before printing.</p>}
  </div>
  {!current?<p role="status">Loading monthly statistics and hotspot context…</p>:current.error?<div role="alert"><p>{current.error}</p><button type="button" className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Retry executive report</button></div>:<>{!executiveFresh(data.generated_at,clock)&&<p role="alert">Statistics snapshot expired or its clock is invalid. Reload before printing.</p>}{sheet}</>}
  <A4PrintPortal header={ready?`Barangay executive summary / ${month} / ${caseTime(data.generated_at)} (Manila)`:'Executive report not ready'} footer="EcoPin / Monthly barangay executive summary">{ready?sheet:<p>Executive report not ready. Apply the month and load fresh statistics before printing.</p>}</A4PrintPortal>
 </div>
}
