'use client'
import {useEffect,useState} from 'react'
import {flushSync} from 'react-dom'
import Link from 'next/link'
import {useRouter,useSearchParams} from 'next/navigation'
import A4PrintPortal from '@/components/print/A4PrintPortal'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {caseTime} from '@/lib/incident-case-record.mjs'
import {operationsToday,validOperationsPeriod,operationsFresh,validateOperationsSummary} from '@/lib/field-crew-operations.mjs'
import styles from './FieldCrewOperationsSummary.module.css'
const text=v=>typeof v==='string'&&v.trim()?v:'Not recorded'
const label=v=>text(v).replaceAll('_',' ')
const account=v=>v||'Not recorded / identity protected'
const accounts=values=>values.length?values.map(account).join(', '):'No individual accounts recorded'
function Table({title,columns,rows,rowKey}){return rows.length?<table><caption>{title}</caption><thead><tr>{columns.map(([title])=><th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={rowKey(row,i)}>{columns.map(([title,value])=><td key={title}>{value(row)}</td>)}</tr>)}</tbody></table>:<p>No matching records.</p>}
function Sheet({data}){
 const day=data.start_day===data.end_day,taskCount=new Set(data.verified.map(v=>v.task_id).filter(Boolean)).size
 return <article aria-label="Field crew operations summary" className={styles.sheet}>
  <header><p>ECOPIN / PASIG CITY / SWMO</p><h1>{day?'Daily field crew operations':'Field crew operations summary'}</h1><p><strong>{data.start_day}{!day&&` through ${data.end_day}`} · Manila calendar dates, inclusive</strong></p><p>Snapshot: {caseTime(data.generated_at)} · Manila (UTC+8)</p></header>
  <section><h2>Shift handover overview</h2><dl className={styles.metrics}>{[['Tasks listed',data.tasks.length],['Assignment changes',data.assignments.length],['Completion-linked stops',data.waypoints.length],['Proof review events',data.verified.length],['Obstacles / observations',data.obstacles.length]].map(([title,count])=><div key={title}><dt>{title}</dt><dd>{count}</dd></div>)}</dl>
   <p>Period entries use recorded assignment, verification and cleanup-completion times. Offline outcomes use server submission time, with claimed observation time shown separately.</p>
   <p>Inventory is current at the snapshot: tasks created or active in the period, plus unfinished/unknown-state tasks created by period-end. Rosters and open blocks reflect snapshot state, not historic end-of-day status.</p>
   <p>Reporter accounts are withheld. Missing dates remain unrecorded; obstacle narratives are internal operational information.</p>
  </section>
  <section><h2>Task inventory and current assignments</h2><Table title="Full task inventory at this snapshot" rows={data.tasks} rowKey={t=>t.task_id} columns={[
   ['Task / current state',t=><><strong>{text(t.title)}</strong><small>{t.task_id}</small><p>{label(t.status)} · Generation {t.assignment_generation??'Not recorded'}</p></>],
   ['Current team / accounts',t=><>{t.current_crew_name||t.current_crew_id||'Team not recorded'}<p>{accounts(t.current_accounts)}</p><small>Account omissions do not establish that the task is unassigned.</small></>],
   ['Recorded dates / notes',t=><>Created: {caseTime(t.created_at)}<p>Scheduled: {t.scheduled_date||'Not recorded'}</p>{t.completed_at&&<p>Completion recorded: {caseTime(t.completed_at)}</p>}{t.current_failure_reason&&<p>Current failure note ({label(t.current_failure_class)}): {t.current_failure_reason}</p>}</>],
  ]} /></section>
  <section><h2>Assignment history recorded in the period</h2><p>Same-generation incident receipts identify recipient accounts where available, not an exact-time team roster. Standalone and older tasks may have no receipt history.</p><Table title="Recorded assignment changes" rows={data.assignments} rowKey={e=>e.event_ref} columns={[
   ['Task / generation',e=><>{e.task_id||'Task no longer recorded'}<small>Generation {e.assignment_generation??'Not recorded'} · {e.event_ref}</small></>],
   ['Change / time',e=><>{e.assigned===false?'Assignment removed':e.assigned===true?'Assignment recorded':'Assignment change recorded'}<p>{caseTime(e.occurred_at)}</p></>],
   ['Responsible account / receipt recipients',e=><>{account(e.actor_id)}<p>Recipients: {accounts(e.receipt_accounts)}</p></>],
  ]} /></section>
  <section><h2>Route stops with recorded cleanup completion</h2><p>Stored stops on currently approved routes are linked to the latest period cleanup completion for that task/incident. These mappings are not GPS visit logs; depot visits and full-route traversal are not established.</p><Table title="Completion-linked route waypoint records" rows={data.waypoints} rowKey={w=>w.waypoint_id} columns={[
   ['Route / stop',w=><>{w.crew_name||w.crew_id||'Team not recorded'}<small>Route {w.route_id}</small><p>Sequence {w.sequence} · {label(w.waypoint_type)}</p><small>{w.waypoint_id}</small></>],
   ['Task / incident',w=><>{w.task_id}<p>Incident: {w.report_id||'Task-level completion'}</p></>],
   ['Completion evidence',w=><>{caseTime(w.completed_at)}<small>{w.completion_ref}</small><p>{account(w.actor_id)}</p></>],
  ]} /></section>
  <section><h2>Officer-reviewed cleanup proof by task</h2><p>{data.verified.length} recorded verification events are associated with {taskCount} distinct task IDs. A review does not verify every incident in a grouped task. Completion alone is not officer verification. Current source match is separate from public-release permission.</p><Table title="Recorded incident proof reviews" rows={data.verified} rowKey={v=>v.event_ref} columns={[
   ['Task / incident',v=><>{v.task_id||'No task recorded'}<p>{v.report_id||'No incident recorded'}</p><small>Generation {v.assignment_generation??'Not recorded'}</small></>],
   ['Verification time / account',v=><>{caseTime(v.verified_at)}<p>{account(v.actor_id)}</p><small>{v.event_ref}</small></>],
   ['Current source match',v=>v.source_matches?'Matches current completed-report proof source':'Not current: source changed, superseded or unavailable'],
  ]} /></section>
  <section><h2>Recorded obstacles and unresolved observations</h2><p>Access blocks and dated failure/outcome records are listed separately. Contested observations are retained as claims. Undated failure notes appear in inventory. Block clearance and cleanup completion are different actions.</p><Table title="Obstacle / observation register" rows={data.obstacles} rowKey={o=>o.event_ref} columns={[
   ['Source / task / incident',o=><strong>{label(o.source)}<small>{o.task_id||'Task not recorded'}</small><small>{o.report_id||'Incident not recorded'}</small><small>{o.event_ref}</small></strong>],
   ['Times / responsibility',o=><>Observed/recorded: {caseTime(o.occurred_at)}<p>Server record: {caseTime(o.recorded_at)}</p><p>{account(o.actor_id)}</p>{!o.activity_in_period&&<small>Current open carryover; no new period activity.</small>}</>],
   ['Recorded conditions / clearance',o=><><strong>{label(o.kind)}{o.disposition&&` · ${label(o.disposition)}`}</strong><p className={styles.notes}>{text(o.notes)}</p>{o.source==='access_block'&&(o.cleared_at?<p>Cleared: {caseTime(o.cleared_at)}<br />By: {account(o.cleared_by)}<br /><span className={styles.notes}>{text(o.clearance_notes)}</span></p>:<p>Still open at snapshot.</p>)}</>],
  ]} /></section>
 </article>
}
export default function FieldCrewOperationsSummary(){
 const params=useSearchParams(),from=params.get('from')||operationsToday(),through=params.get('through')||from
 return <Session key={`${from}:${through}`} from={from} through={through} />
}
function Session({from,through}){
 const router=useRouter(),[draft,setDraft]=useState({from,through}),[attempt,setAttempt]=useState(0),[resource,setResource]=useState(null),[clock,setClock]=useState(()=>Date.now()),[printing,setPrinting]=useState(false),[validation,setValidation]=useState('')
 const key=`${from}:${through}:${attempt}`,changed=draft.from!==from||draft.through!==through
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer)},[])
 useEffect(()=>{const controller=new AbortController();async function load(){try{
  if(!validOperationsPeriod(from,through))throw new Error('Choose 1-366 valid Manila calendar days ending no later than today.')
  const response=await backendFetch(`/api/backend/api/sweeper/operations-summary?${new URLSearchParams({from,through})}`,{signal:controller.signal,cache:'no-store'})
  if(!response.ok)throw new Error(response.status===422?'Summary too large. Narrow the dates; no partial export was produced.':'Operations summary could not load. Check access and required migrations, then retry.')
  const data=validateOperationsSummary(await response.json(),from,through)
  if(!controller.signal.aborted){setClock(Date.now());setResource({key,data})}
 }catch(error){if(!controller.signal.aborted)setResource({key,error:error.message})}}load();return()=>controller.abort()},[from,through,key])
 const current=resource?.key===key?resource:null,data=current?.data,ready=!!data&&!changed&&operationsFresh(data.generated_at,clock)
 function apply(e){e.preventDefault();if(!validOperationsPeriod(draft.from,draft.through)){setValidation('Choose 1-366 valid Manila calendar days ending no later than today.');return}setValidation('');router.push(`/dashboard/operations-summary?${new URLSearchParams(draft)}`)}
 async function print(){if(!data||changed||printing||!operationsFresh(data.generated_at))return;setPrinting(true);try{await document.fonts.ready;flushSync(()=>setClock(Date.now()));if(operationsFresh(data.generated_at))window.print()}finally{setPrinting(false)}}
 const sheet=data&&<Sheet data={data}/>
 return <div className={`workspace-page workspace-page--flow ${styles.preview}`}>
  <div className={styles.controls}><Link href="/dashboard" className="btn-secondary">Back to dashboard</Link><button type="button" className="btn-primary" disabled={!ready||printing} onClick={print}>{printing?'Preparing print…':'Print / Save PDF'}</button><button type="button" className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reload summary</button>
   <form onSubmit={apply} noValidate><label>From date<input type="date" value={draft.from} min="2000-01-01" max={operationsToday()} onChange={e=>setDraft({...draft,from:e.target.value})}/></label><label>Through date<input type="date" value={draft.through} min="2000-01-01" max={operationsToday()} onChange={e=>setDraft({...draft,through:e.target.value})}/></label><button type="submit" className="btn-secondary">Apply dates</button><button type="button" className="btn-secondary" onClick={()=>setDraft({from:operationsToday(),through:operationsToday()})}>Use today</button></form>
   <p>A4 portrait. Choose “Save as PDF” in the print dialog; turn off browser-added headers and footers. Dates are inclusive and use Manila time. Use the same date for a daily handover.</p>
   {changed&&<p role="status">Date changes are not applied. Apply dates before printing.</p>}{validation&&<p role="alert">{validation}</p>}
  </div>
  {!current?<p role="status">Loading complete operations summary…</p>:current.error?<div role="alert"><p>{current.error}</p><button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Retry operations summary</button></div>:<>{!operationsFresh(data.generated_at,clock)&&<p role="alert">The snapshot is expired or its clock is invalid. Reload before printing.</p>}{sheet}</>}
  <A4PrintPortal header={ready?`Crew operations / ${from} to ${through} / ${caseTime(data.generated_at)} (Manila)`:'Operations summary not ready'} footer="EcoPin / Field crew operations summary">{ready?sheet:<p>Operations summary not ready. Apply the dates and load a fresh complete snapshot before printing.</p>}</A4PrintPortal>
 </div>
}
