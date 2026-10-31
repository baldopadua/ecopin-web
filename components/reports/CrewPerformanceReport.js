'use client'
import {useEffect,useMemo,useState} from 'react'
import {flushSync} from 'react-dom'
import Link from 'next/link'
import A4PrintPortal from '@/components/print/A4PrintPortal'
import {fetchCrewPerformance} from '@/lib/api'
import {caseTime} from '@/lib/incident-case-record.mjs'
import {CSAT_SCALE,getCsatEntry} from '@/lib/helpers/csatScale'
import styles from './FieldCrewOperationsSummary.module.css'

const hours=v=>v!=null&&v!==''?`${v}h`:'Not recorded'
const csat=(rating,count)=>{const entry=getCsatEntry(rating);return entry?`${Number(rating).toFixed(1)} · ${entry.label}${count!=null?` (${count} ${count===1?'review':'reviews'})`:''}`:'Not rated'}
const date=v=>v?new Date(v).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Manila'}):'Not recorded'
const role=v=>(v||'field_crew').replaceAll('_',' ')
function Table({title,columns,rows,rowKey}){return rows.length?<table><caption>{title}</caption><thead><tr>{columns.map(([name])=><th scope="col" key={name}>{name}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={rowKey(row,i)}>{columns.map(([name,value])=><td key={name}>{value(row)}</td>)}</tr>)}</tbody></table>:<p>No matching records.</p>}

function Sheet({data,generatedAt}){
 const overall=data.overall||{},crews=data.crews||[],members=data.members||[]
 const tasks=useMemo(()=>{const seen=new Map();for(const m of members)for(const t of m.tasks||[])if(!seen.has(t.id))seen.set(t.id,{...t,member_name:m.full_name});return [...seen.values()].sort((a,b)=>(Date.parse(b.completed_at)||0)-(Date.parse(a.completed_at)||0))},[members])
 const dist=overall.rating_distribution||{},reviews=CSAT_SCALE.reduce((sum,e)=>sum+(dist[e.rating]||0),0)
 return <article aria-label="Crew performance and CSAT report" className={styles.sheet}>
  <header><p className={styles.label}>EcoPin · Pasig City Solid Waste Management Office</p><h1>Crew performance and citizen satisfaction</h1><p className={styles.period}>All recorded completed cleanup tasks</p><p className={styles.snapshot}>Snapshot taken {caseTime(generatedAt)} · Manila time (UTC+8)</p></header>
  <section><h2>Overview</h2>
   <dl className={styles.metrics} style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>{[['Tasks resolved',overall.total_completed||0],['Average resolution',hours(overall.avg_turnaround_hours)],['Citizen satisfaction',overall.avg_satisfaction_rating!=null?`${Number(overall.avg_satisfaction_rating).toFixed(1)} / 5`:'Not rated']].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
   <p>Resolution time runs from assignment to recorded completion. Satisfaction is the average of verified citizen ratings from 1 to 5; tasks without a citizen rating are not counted.</p>
  </section>
  <section><h2>How citizens rated cleanups</h2><Table title={`${reviews} verified citizen ${reviews===1?'review':'reviews'}`} rows={[...CSAT_SCALE].reverse()} rowKey={e=>e.rating} columns={[
   ['Rating',e=>`${e.rating} · ${e.label}`],
   ['Reviews',e=>dist[e.rating]||0],
   ['Share',e=>reviews>0?`${(((dist[e.rating]||0)/reviews)*100).toFixed(0)}%`:'0%'],
  ]} /></section>
  <section><h2>Crew teams</h2><Table title="Performance by crew team" rows={crews} rowKey={c=>c.id||c.name} columns={[
   ['Team',c=><><strong>{c.name||'Unnamed crew'}</strong>{c.team_lead?.full_name&&<small>Lead: {c.team_lead.full_name}</small>}</>],
   ['Members',c=>c.member_count||0],
   ['Resolved',c=>c.performance?.total_completed||0],
   ['Average turnaround',c=>hours(c.performance?.avg_turnaround_hours)],
   ['Citizen CSAT',c=>csat(c.performance?.avg_satisfaction_rating,c.performance?.total_ratings_received||0)],
  ]} /></section>
  <section><h2>Personnel</h2><Table title="Performance by crew member" rows={members} rowKey={m=>m.id||m.email} columns={[
   ['Crew member',m=><><strong>{m.full_name||'Unnamed crew member'}</strong><small>{role(m.role)}</small></>],
   ['Resolved',m=>m.performance?.total_completed||0],
   ['Average turnaround',m=>hours(m.performance?.avg_turnaround_hours)],
   ['Citizen CSAT',m=>csat(m.performance?.avg_satisfaction_rating,m.performance?.total_ratings_received||0)],
  ]} /></section>
  <section><h2>Completed cleanup tasks</h2><p>{tasks.length} completed {tasks.length===1?'task':'tasks'}, newest first. A task is listed once, under the first crew member who has it on record.</p><Table title="Completed task log" rows={tasks} rowKey={t=>t.id} columns={[
   ['Task',t=><strong>{t.title||'Cleanup task'}</strong>],
   ['Completed by',t=>t.member_name||'Not recorded'],
   ['Completed',t=>date(t.completed_at)],
   ['Duration',t=>hours(t.turnaround_hours)],
   ['Citizen rating',t=>t.avg_rating?csat(t.avg_rating):'Not rated'],
   ['Reports',t=>t.reports_count||1],
  ]} /></section>
 </article>
}

export default function CrewPerformanceReport(){
 const [attempt,setAttempt]=useState(0),[result,setResult]=useState(null),[printing,setPrinting]=useState(false)
 useEffect(()=>{let live=true;fetchCrewPerformance().then(data=>{if(live)setResult({attempt,data,generatedAt:new Date().toISOString()})}).catch(error=>{if(live)setResult({attempt,error:error.message||'The performance report could not load.'})});return()=>{live=false}},[attempt])
 const current=result?.attempt===attempt?result:null,data=current?.data
 const ready=!!data&&((data.members?.length||0)>0||(data.crews?.length||0)>0)
 async function print(){if(!ready||printing)return;setPrinting(true);try{await document.fonts.ready;flushSync(()=>{});window.print()}finally{setPrinting(false)}}
 const sheet=data&&<Sheet data={data} generatedAt={current.generatedAt}/>
 return <div className={`workspace-page workspace-page--flow ${styles.preview}`}>
  <div className={styles.controls}>
   <div className={styles.toolbar}>
    <Link href="/dashboard/officer/crew-management" className="btn-secondary">Back to crew management</Link>
    <span className={styles.spacer} />
    <button type="button" className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Reload report</button>
    <button type="button" className="btn-primary" disabled={!ready||printing} onClick={print}>{printing?'Preparing print…':'Print / Save PDF'}</button>
   </div>
   <p className={styles.note}>Prints on A4 portrait. In the print dialog, choose Save as PDF and turn off headers and footers. The report uses all recorded completed tasks at the snapshot time.</p>
  </div>
  {!current?<p role="status">Loading performance report…</p>:current.error?<div role="alert"><p>{current.error}</p><button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Retry performance report</button></div>:data&&!ready?<p role="status">There is no crew performance data to print yet.</p>:sheet}
  <A4PrintPortal header={ready?`Crew performance and CSAT · snapshot ${caseTime(current.generatedAt)} (Manila)`:'Performance report not ready'} footer="EcoPin crew performance and CSAT report">{ready?sheet:<p>Performance report not ready. Load the data before printing.</p>}</A4PrintPortal>
 </div>
}
