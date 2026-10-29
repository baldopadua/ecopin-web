'use client'
import {useEffect,useState} from 'react'
import A4PrintPortal from '@/components/print/A4PrintPortal'
import Link from 'next/link'
import Image from 'next/image'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import {formatReportAddress} from '@/lib/format-location.mjs'
import {OPERATIONAL_EVENT_LABELS} from '@/lib/operational-events.mjs'
import {caseCoordinates,caseTime,caseProofUrl,validateCaseRecord} from '@/lib/incident-case-record.mjs'
import styles from './IncidentCaseRecord.module.css'
const text=value=>typeof value==='string'&&value.trim()?value:'Not recorded'
const label=value=>text(value).replaceAll('_',' ')
function CaseSheet({data,photos,accessNote,onImageLoad,onImageError}){
 const r=data.report
 return <article className={styles.sheet} aria-label="Incident case record">
  <header className={styles.masthead}><p>ECOPIN / PASIG CITY / SWMO</p><h1>Incident case record</h1><p>Incident ID: {r.id}</p><p>Record snapshot: {caseTime(data.snapshot_at)} · Manila (UTC+8)</p></header>
  <p className={styles.notice}>Internal municipal copy. Handle incident narratives and access directions as restricted operational information.</p>
  <section><h2>Incident summary</h2><h3>{text(r.title)}</h3><dl className={styles.facts}>
   <div><dt>Reported</dt><dd>{caseTime(r.created_at)}</dd></div><div><dt>Concern</dt><dd>{label(r.issue_type)}</dd></div>
   <div><dt>Current response</dt><dd>{label(r.status)}</dd></div><div><dt>Verification / stage</dt><dd>{label(r.validation_status)} / {label(r.stage)}</dd></div>
   <div><dt>Citizen priority</dt><dd>{label(r.citizen_priority)}</dd></div><div><dt>Linked task</dt><dd>{text(r.cleanup_task_id)}</dd></div>
  </dl><p className={styles.preserve}>{text(r.description)}</p></section>
  <section><h2>Location and access</h2><dl className={styles.facts}>
   <div><dt>Recorded address</dt><dd>{formatReportAddress(r)}{!r.street_address&&<span> · Street-level address not recorded; use the incident pin.</span>}</dd></div>
   <div><dt>Pin (latitude, longitude)</dt><dd>{caseCoordinates(r)}{r.location_precision==='approximate'?' · Approximate location':''}</dd></div>
   <div><dt>Citizen landmark / access information</dt><dd>{text(r.citizen_landmark)}<small>Supplementary directions; does not replace the GIS pin or establish access permission.</small></dd></div>
   <div><dt>Property access</dt><dd>{r.on_private_property===true?`Private property. Recorded owner consent: ${label(r.property_owner_consent_status)}.`:r.on_private_property===false?'Not flagged as private property.':'Private-property status not recorded.'}</dd></div>
  </dl>{accessNote.trim()&&<p className={styles.preserve}><strong>Additional access instructions (this print copy only):</strong><br />{accessNote}</p>}</section>
  <section className={styles.evidence}><h2>Before / after cleanup evidence</h2>
   {!data.proof?<p>No officer-approved, privacy-reviewed public cleanup proof is available. Originals are not included.</p>:<>
    <p className={styles.preserve}>{text(data.proof.public_notes)}</p>
    <div className={styles.photos}>{['before','after'].map(slot=><figure key={slot}>
     <Image unoptimized src={photos[slot]} width={1200} height={900} loading="eager" alt={`${slot==='before'?'Before':'After'} cleanup, officer-approved redacted copy`} onLoad={()=>onImageLoad?.(slot)} onError={onImageError} />
     <figcaption>{slot==='before'?'Before':'After'} cleanup · privacy-reviewed copy</figcaption>
    </figure>)}</div><p>Completed: {caseTime(data.proof.completed_at)}<br />Verified: {caseTime(data.proof.verified_at)}<br />Proof publication: {data.proof.id}</p>
   </>}
  </section>
  <section><h2>Recorded operational lifecycle ({data.events.length})</h2>
   <p>All recorded events at the snapshot, ordered by server record sequence. Task-wide context is shared task activity, not proof of a separate incident action. Device arrival times are crew claims, not server-attested physical presence.</p>
   {!data.events.length?<p>No discrete operational milestones recorded. Earlier events are not inferred from updated_at.</p>:<table><thead><tr><th>Milestone / scope</th><th>Occurrence / server receipt (Manila)</th><th>Responsible account / details</th></tr></thead><tbody>{data.events.map(e=><tr key={e.id}>
    <td><strong>{OPERATIONAL_EVENT_LABELS[e.event_type]}</strong><br />{e.scope==='task_context'?'Task-wide context':'Incident'}{e.task_id&&<small>Task {e.task_id}</small>}<small>Event {e.id} · Assignment generation {e.assignment_generation??'not recorded'}</small></td>
    <td>{caseTime(e.occurred_at)}<small>{e.time_basis==='device_reported'?'Device-reported':'Server-recorded'}</small><small>Received: {caseTime(e.recorded_at)}</small></td>
    <td>{text(e.actor_id)}{e.details?.slot&&<small>{label(e.details.slot)} cleanup evidence</small>}{e.details?.disposition&&<small>{label(e.details.disposition)}</small>}{e.details?.assigned===false&&<small>Assignment removed</small>}</td>
   </tr>)}</tbody></table>}
  </section>
  <section><h2>Incident activity history ({data.activity.length})</h2><p>All available privacy-filtered activity entries, oldest first. These legacy entries are separate from discrete operational events; missing dates and identities are not reconstructed.</p>
   {!data.activity.length?<p>No activity entries recorded.</p>:<table><thead><tr><th>Recorded time / action</th><th>Responsible account</th><th>Recorded details</th></tr></thead><tbody>{data.activity.map(e=><tr key={e.id}><td>{caseTime(e.occurred_at)}<small>{label(e.action_type)}</small><small>Activity {e.id}</small></td><td>{e.actor_id||'Not recorded / identity protected'}</td><td className={styles.preserve}>{text(e.action_details)}</td></tr>)}</tbody></table>}
  </section>

 </article>
}
export default function IncidentCaseRecord({reportId}){return <CaseRecordSession key={reportId} reportId={reportId} />}
function CaseRecordSession({reportId}){
 const [attempt,setAttempt]=useState(0),[resource,setResource]=useState(null),[loaded,setLoaded]=useState({}),[accessNote,setAccessNote]=useState(''),[printing,setPrinting]=useState(false)
 const key=`${reportId}:${attempt}`
 useEffect(()=>{
  const controller=new AbortController(),urls=[]
  async function load(){try{
   const response=await backendFetch(`/api/backend/api/reports/${encodeURIComponent(reportId)}/case-record`,{signal:controller.signal,cache:'no-store'})
   if(!response.ok)throw new Error(response.status===404?'Incident not found.':response.status===422?'This case is too large for one printable record. No partial history was loaded.':'The case record could not load. Retry before printing.')
   const data=validateCaseRecord(await response.json(),reportId),photos={}
   if(data.proof)for(const slot of ['before','after']){
    const image=await backendFetch(caseProofUrl(reportId,data.proof,slot),{signal:controller.signal,cache:'no-store'})
    if(!image.ok||!image.headers.get('content-type')?.startsWith('image/'))throw new Error('Approved evidence could not load or has changed. Reload the case before printing.')
    const blob=await image.blob();if(!blob.size||blob.size>10485760)throw new Error('Approved evidence is unavailable or too large to print.')
    if(controller.signal.aborted)return
    photos[slot]=URL.createObjectURL(blob);urls.push(photos[slot])
   }
   if(!controller.signal.aborted)setResource({key,data,photos})
  }catch(error){if(!controller.signal.aborted)setResource({key,error:error.message})}}
  load();return ()=>{controller.abort();urls.forEach(url=>URL.revokeObjectURL(url))}
 },[reportId,key])
 const current=resource?.key===key?resource:null,data=current?.data
 const ready=Boolean(data&&(!data.proof||(loaded.key===key&&loaded.before&&loaded.after))&&!current.imageError)
 const imageReady=slot=>setLoaded(old=>({...old,...(old.key!==key?{before:false,after:false}:{}),key,[slot]:true}))
 const imageError=()=>setResource(old=>old?.key===key?{...old,imageError:true}:old)
 async function print(){if(!ready||printing)return;setPrinting(true);try{await document.fonts.ready;window.print()}finally{setPrinting(false)}}
 const sheet=data&&<CaseSheet data={data} photos={current.photos} accessNote={accessNote} onImageLoad={imageReady} onImageError={imageError} />
 return <div className={`workspace-page workspace-page--flow ${styles.preview}`}>
  <div className={styles.controls}><Link href={`/dashboard/raw-data/${encodeURIComponent(reportId)}`} className="btn-secondary">Back to incident</Link>
   <button className="btn-primary" type="button" disabled={!ready||printing} onClick={print}>{printing?'Preparing print…':'Print / Save PDF'}</button>
   <button className="btn-secondary" type="button" onClick={()=>setAttempt(n=>n+1)}>Reload record</button>
   <p>A4 portrait. Choose “Save as PDF” in the print dialog. Turn off browser headers and footers for a clean archive copy. Long histories continue onto additional pages.</p>
   <label>Additional access instructions (this PDF only)<textarea className="input w-full" rows={2} maxLength={2000} value={accessNote} onChange={e=>setAccessNote(e.target.value)} placeholder="Optional directions for the field team; avoid personal contact details." /></label>
  </div>
  {!current?<p role="status">Loading complete case record and approved evidence…</p>:current.error?<div role="alert"><p>{current.error}</p><button className="btn-secondary" onClick={()=>setAttempt(n=>n+1)}>Retry case record</button></div>:<>
   {current.imageError?<p role="alert">Approved evidence could not be decoded. Reload before printing.</p>:!ready&&<p role="status">Preparing evidence images…</p>}
   {sheet}
  </>}
  <A4PrintPortal header={ready?`Incident ${reportId} / Snapshot ${caseTime(data.snapshot_at)} (Manila)`:'Case record not ready'} footer="EcoPin / Incident case record">{ready?sheet:<p>Case record is not ready. Load the complete record and evidence before printing.</p>}</A4PrintPortal>
 </div>
}
