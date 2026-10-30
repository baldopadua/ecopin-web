"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useUser} from '@/components/auth/UserContext';
import Button from '@/components/ui/Button';
import {buildMunicipalDecisions,DECISION_RULES} from '@/lib/municipal-decisions.mjs';
import styles from './MunicipalDecisionCards.module.css';
import {trendPeriodLabel} from '@/lib/barangay-trends.mjs';
const types={resources:'Collection and crew planning',verification:'Verification capacity',resolution:'Resolution blockers'};
export default function MunicipalDecisionCards({data,area='all',paused=false}){
 const user=useUser();
 const [clock,setClock]=useState(()=>Date.now());
 const [type,setType]=useState('all'),[expanded,setExpanded]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[]);
 const result=buildMunicipalDecisions(data,{now:new Date(clock)});
 const ready=!paused&&result.status==='ready';
 const cards=ready?result.cards.filter(c=>(area==='all'||c.areaKey===area)&&(type==='all'||c.type===type)):[];
 const shown=expanded?cards:cards.slice(0,6);
 function destination(card){
  if(card.destination==='reports')return {href:'/dashboard/officer/reports',label:'Open report queue'};
  return user?.role==='admin'
   ?{href:'/dashboard/admin/settings?tab=fleet',label:'Review resource settings'}
   :{href:'/dashboard/officer/optimization',label:'Review dispatch capacity'};
 }
 return <section className={styles.section} aria-label="Municipal decision proposals">
  <div className={styles.header}><div><h2>Decision proposals</h2>
   <p>Suggested next steps from the figures above. Review capacity before changing a schedule.</p></div></div>
  {!ready?<p className={styles.notice} role="status">{paused?'Decision proposals are paused while months are unapplied, analytics is refreshing, or a request has failed. Apply months and refresh to use current evidence.':result.notices.join(' ')}</p>:<>
   {result.comparison&&<p className={styles.scope}>Comparing {trendPeriodLabel(result.comparison)}.</p>}
   {result.notices.map(notice=><p className={styles.notice} key={notice}>{notice}</p>)}
   <div className={styles.filters}>
    <label>Decision type<select aria-label="Decision type" value={type} onChange={e=>{setType(e.target.value);setExpanded(false);}}><option value="all">All proposal types</option>{Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <p role="status">{shown.length} of {cards.length} matching proposals shown · {result.cards.length} across all official barangays. Area follows the barangay selected above.</p>
   </div>
   {cards.length===0&&<p className={styles.notice}>No planning rule matched this view. This does not mean there is no field work; inspect the ordinary report and dispatch queues.</p>}
   <div className={styles.grid}>{shown.map(card=>{
    const action=destination(card);
    return <article className={styles.card} key={card.id} aria-label={`${card.area}: ${card.title}`}>
     <p className={styles.eyebrow}>{card.area} · {types[card.type]}</p>
     <h3>{card.title}</h3><p className={styles.proposal}>{card.proposal}</p>
     <div className={styles.evidence}><h4>Observed evidence</h4><ul>{card.evidence.map(value=><li key={value}>{value}</li>)}</ul></div>
     <details><summary>Why this proposal?</summary><p><strong>Rule {card.ruleId}</strong>: {card.trigger}</p><p>Matched: {card.matchedRules.join(', ')}. One resource proposal is issued per barangay even when multiple resource triggers match.</p><p>Rule order: collection growth, aged backlog, verification queue, resolution tail; then strongest matching measure and barangay name. These are planning priorities, not incident severity.</p></details>
     <details><summary>Confirm before acting</summary><ul>{[...card.missingFacts,...card.checks].map(value=><li key={value}>{value}</li>)}</ul></details>
     <Link href={action.href} className={styles.link}>{action.label}</Link>
    </article>;
   })}</div>
   {cards.length>6&&<Button type="button" variant="secondary" onClick={()=>setExpanded(value=>!value)}>{expanded?'Show first 6 proposals':`Show all ${cards.length} proposals`}</Button>}
  </>}
  <details className={styles.rules}><summary>Rule policy and limitations</summary>
   <p>Policy {result.ruleVersion}. These proposals use draft planning rules.</p>
   <ul><li>Collection growth: at least {DECISION_RULES.growthPercent}% growth; baseline ≥{DECISION_RULES.minimumPreviousReports}, current ≥{DECISION_RULES.minimumCurrentReports}, current backlog ≥{DECISION_RULES.minimumBacklog}, and ≥80% location coverage in each comparison window.</li>
    <li>Aged backlog: at least {DECISION_RULES.agedBacklog} open cases aged 7+ days. Current backlog covers all months, including assigned cases.</li>
    <li>Verification: at least {DECISION_RULES.pendingReview} pending submissions in the selected creation cohort, with fewer than {DECISION_RULES.processedPercent}% approved or rejected. Automated decisions are included.</li>
    <li>Resolution tail: at least {DECISION_RULES.resolutionSamples} samples, 90th-percentile duration ≥{DECISION_RULES.resolutionP90Hours} hours, and at least {DECISION_RULES.resolutionAgedBacklog} open cases aged 7+ days. The 72-hour trigger is not an SLA deadline.</li>
   </ul><p>Snapshots older than 24 hours cannot produce proposals. Partial months and small/zero baselines cannot produce growth proposals. Unassigned locations are never allocated a named barangay resource. Historical ranges that exclude the latest complete snapshot month cannot produce growth or resolution-tail proposals.</p>
   <p>These are draft planning heuristics, not measured staffing requirements or proof that a schedule change will reduce waste. Current collection frequency, truck availability and named-crew readiness are not in this analytics snapshot. A proposed additional visit is not a claim that collection currently runs once weekly. Review actual assignments, vehicle loads, access, consent and safety before committing resources.</p>
   <p>Changing the applied month range changes cohort-based proposals. Filters only narrow this view; CSV contains every matched proposal with its snapshot, rule and checks.</p>
  </details>
 </section>;
}
