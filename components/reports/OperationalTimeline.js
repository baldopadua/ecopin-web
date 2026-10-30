'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {OPERATIONAL_EVENT_LABELS,operationalDuration,validateOperationalPage} from '@/lib/operational-events.mjs'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const time=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})
export default function OperationalTimeline({taskId,reportId}){
 // An entity change starts a new pagination session before any request can use an old cursor.
 return <ScopedOperationalTimeline key={JSON.stringify([taskId??null,reportId??null])} taskId={taskId} reportId={reportId} />
}
function ScopedOperationalTimeline({taskId,reportId}){
 const [draft,setDraft]=useState({task:'',report:''}),[applied,setApplied]=useState({task:'',report:''}),[filterError,setFilterError]=useState('')
 const [cursor,setCursor]=useState(null),[retry,setRetry]=useState(0),[resource,setResource]=useState(null)
 const task=taskId||applied.task,report=reportId||applied.report
 const params=new URLSearchParams({limit:'50'});if(task)params.set('task_id',task);if(report)params.set('report_id',report);if(cursor)params.set('before_id',cursor)
 const query=params.toString(),key=`${query}:${retry}`
 useEffect(()=>{
  const controller=new AbortController()
  backendFetch(`/api/backend/api/operational-events?${query}`,{signal:controller.signal})
   .then(r=>{if(!r.ok)throw new Error('Operational events could not load.');return r.json()})
   .then(validateOperationalPage).then(data=>{if(!controller.signal.aborted)setResource({key,data})})
   .catch(e=>{if(!controller.signal.aborted)setResource({key,error:e.message})})
  return ()=>controller.abort()
 },[query,key])
 const ready=resource?.key===key,data=ready?resource.data:null
 function apply(e){e.preventDefault();if((draft.task&&!UUID.test(draft.task))||(draft.report&&!UUID.test(draft.report))){setFilterError('Enter valid task/report UUIDs, or leave the fields empty.');return}
  setApplied({task:draft.task.toLowerCase(),report:draft.report.toLowerCase()});setCursor(null);setRetry(n=>n+1);setFilterError('')
 }
 return <section aria-label="Operational event timeline" className="card space-y-4 min-w-0">
  <h2 className="text-xl font-semibold">Operational event timeline</h2>
  <p className="text-sm text-text-secondary">Newest recorded first. All displayed times are Manila (UTC+8). Device-reported arrivals may reach the server later; they are not server-verified physical presence.</p>
  {!taskId&&!reportId&&<form onSubmit={apply} className="flex flex-wrap items-end gap-3">
   <label className="min-w-0 flex-1 text-sm">Task UUID (optional)<input className="input w-full min-w-0" value={draft.task} onChange={e=>setDraft(old=>({...old,task:e.target.value.trim()}))} /></label>
   <label className="min-w-0 flex-1 text-sm">Report UUID (optional)<input className="input w-full min-w-0" value={draft.report} onChange={e=>setDraft(old=>({...old,report:e.target.value.trim()}))} /></label>
   <button className="btn-secondary" type="submit">Apply scope</button>
  </form>}
  {filterError&&<p role="alert">{filterError}</p>}
  <p className="text-xs text-text-secondary break-all">Current scope: {task?`Task ${task}`:''}{task&&report?' · ':''}{report?`Report ${report}`:''}{!task&&!report?'All operations':''}</p>
  {!ready?<p role="status">Loading recorded events…</p>:resource.error?<div role="alert"><p>{resource.error}</p><button type="button" className="btn-secondary mt-3" onClick={()=>setRetry(n=>n+1)}>Retry timeline</button></div>:<>
   {data.server_turnaround&&<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-border py-4 text-sm">
    <div><dt>Assignment to acknowledgement</dt><dd className="font-medium">{operationalDuration(data.server_turnaround.assignment_to_acknowledgement_seconds)}</dd></div>
    <div><dt>Acknowledgement to completion</dt><dd className="font-medium">{operationalDuration(data.server_turnaround.acknowledgement_to_completion_seconds)}</dd></div>
   </dl>}
   {data.events.length===0?<p>No recorded milestones. Earlier activity is not inferred from report status or update dates.</p>:<ol className="divide-y divide-border">
    {data.events.map(event=><li key={event.id} className="py-4 space-y-2 min-w-0">
     <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{OPERATIONAL_EVENT_LABELS[event.event_type]}</h3><time className="text-sm" dateTime={event.occurred_at}>{time(event.occurred_at)}</time></div>
     <p className="text-sm">{event.time_basis==='device_reported'?'Device-reported time':'Server-recorded time'} · Responsible account: <span className="break-all">{event.actor_id||'Not recorded / identity protected'}</span></p>
     <p className="text-xs text-text-secondary">Received by server: <time dateTime={event.recorded_at}>{time(event.recorded_at)}</time></p>
     <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs break-all">
      {event.task_id&&<Link className="underline" href={`/dashboard/officer/operations/${event.task_id}`}>Task {event.task_id}</Link>}
      {event.report_id&&<Link className="underline" href={`/dashboard/raw-data/${event.report_id}`}>Report {event.report_id}</Link>}
     </div>
     {event.event_type==='task_transition'&&<p className="text-sm">{event.details?.from_status||'Created'} → {event.details?.to_status||'Not recorded'}</p>}
     {event.details?.slot&&<p className="text-xs text-text-secondary">{event.details.slot==='before'?'Before':'After'} cleanup evidence</p>}
     {event.event_type==='assignment'&&event.details?.assigned===false&&<p className="text-sm">Assignment removed</p>}
     {event.details?.disposition&&<p className="text-xs text-text-secondary">Receipt disposition: {event.details.disposition.replaceAll('_',' ')}</p>}
     {event.completion_to_verification_seconds!==null&&event.completion_to_verification_seconds!==undefined&&<p className="text-sm">Recorded completion to verification: {operationalDuration(event.completion_to_verification_seconds)}</p>}
    </li>)}
   </ol>}
   <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={()=>{setCursor(null);setRetry(n=>n+1)}}>Refresh newest</button><button type="button" className="btn-secondary" disabled={!data.has_more} onClick={()=>setCursor(data.next_cursor)}>Older events</button></div>
  </>}
 </section>
}
