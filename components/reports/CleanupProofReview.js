'use client'
import {useState} from 'react'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import PublicCleanupProof from './PublicCleanupProof'
import SecureImage from '@/components/ui/SecureImage'

const slots=['before','after']
function RedactionEditor({slot,url,regions,onChange,onReady,onFailure}) {
 return <fieldset className="min-w-0 space-y-3 border border-border rounded-lg p-3">
  <legend className="px-1 font-medium capitalize">{slot} cleanup</legend>
  <div className="relative">
   <SecureImage src={url} alt={`${slot} cleanup original for officer privacy review`} className="w-full block" onLoad={onReady} onError={onFailure} />
   {regions.map((r,i)=><span key={i} aria-hidden="true" style={{position:'absolute',background:'#000',left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`}} />)}
  </div>
  <p className="text-xs text-text-secondary">Cover faces, plates, names and other sensitive details. Area values are percentages measured from the left and top.</p>
  {regions.map((region,i)=><div key={i} className="border-t border-border pt-2">
   <div className="grid grid-cols-2 gap-2">{['x','y','width','height'].map(key=><label key={key} className="text-sm">{slot} area {i+1} {key} (%)
    <input type="number" min={key==='width'||key==='height'?1:0} max="100" step="1" value={Math.round(region[key]*100)} className="w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-text-primary" onChange={e=>onChange(regions.map((r,n)=>n===i?{...r,[key]:Number(e.target.value)/100}:r))} />
   </label>)}</div>
   <button type="button" className="btn-secondary mt-2" onClick={()=>onChange(regions.filter((_,n)=>n!==i))}>Remove {slot} area {i+1}</button>
  </div>)}
  <button type="button" className="btn-secondary" disabled={regions.length>=100} onClick={()=>onChange([...regions,{x:0.1,y:0.1,width:0.2,height:0.2}])}>Add hidden area to {slot}</button>
 </fieldset>
}
export default function CleanupProofReview({reportId}) {
 const [source,setSource]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [regions,setRegions]=useState({before:[],after:[]}),[notes,setNotes]=useState(''),[privacy,setPrivacy]=useState(false),[saved,setSaved]=useState(false)
 const [ready,setReady]=useState({before:false,after:false})
 const [attempt,setAttempt]=useState(0)
 const base=`/api/backend/api/reports/${encodeURIComponent(reportId)}/cleanup-proof`
 async function load(){setBusy(true);setError('');try{
  const r=await backendFetch(base);if(!r.ok)throw new Error('Proof review could not load. Try again.');
  const data=await r.json();setSource(data);setRegions(data.existing_redactions||{before:[],after:[]});setReady({before:false,after:false});setPrivacy(false);setNotes(data.existing_public_notes||'');setSaved(false);setAttempt(n=>n+1)
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 async function publish(e){e.preventDefault();if(!ready.before||!ready.after)return;setBusy(true);setError('');try{
  const r=await backendFetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:source.version,fingerprint:source.fingerprint,publication_id:source.publication_id??null,redactions:regions,public_notes:notes,privacy_checked:privacy})})
  if(!r.ok)throw new Error(r.status===409?'Proof changed. Reload and review the new photos.':'Proof was not approved. Check the notes and hidden areas, then retry.')
  setSaved(true);setSource(null)
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="card space-y-4" aria-label="Officer cleanup proof review">
  <h2 className="text-xl font-semibold">Cleanup proof verification</h2>
  <p className="text-sm text-text-secondary">Verify the completed work and prepare a public copy. Originals stay private. This review does not change the cleanup status.</p>
  <button type="button" disabled={busy} className="btn-secondary" onClick={load}>{busy?'Working…':'Load proof for review'}</button>
  {error&&<p role="alert">{error}</p>}{saved&&<p role="status">Cleanup proof verified. The public copy is available only while this report is publicly visible.</p>}
  {source&&(!source.before_url||!source.after_url||!source.completed_at?<p role="status">A completed cleanup with Before and After photos is required before review.</p>:<form onSubmit={publish} className="space-y-4">
   <p className="text-sm whitespace-pre-wrap">Action notes: {source.action_notes||'No action notes recorded; verify the work before approving.'}</p>
   <p className="text-sm">Completion recorded: {new Date(source.completed_at).toLocaleString()}</p>
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{slots.map(slot=><RedactionEditor key={`${slot}-${attempt}`} slot={slot} url={`${base}/original/${slot}`} regions={regions[slot]} onChange={value=>setRegions(old=>({...old,[slot]:value}))} onReady={()=>setReady(old=>({...old,[slot]:true}))} onFailure={()=>{setReady(old=>({...old,[slot]:false}));setError('Both originals must load before you can verify the cleanup.')}} />)}</div>
   <label className="block" htmlFor={`public-cleanup-notes-${reportId}`}>Public action notes (required)</label>
   <textarea id={`public-cleanup-notes-${reportId}`} required maxLength={2000} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-lg border border-border bg-surface p-3 text-text-primary" />
   <p className="text-xs text-text-secondary">Describe the cleanup without names, contact details or other identifying information. Crew notes are not copied automatically.</p>
   <label className="flex gap-3 items-start"><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)} /><span>I reviewed both photos and the public notes, covered sensitive details, and verified that the After photo documents the cleanup.</span></label>
   <button type="submit" className="btn-primary" disabled={busy||!privacy||!notes.trim()||!ready.before||!ready.after}>Verify and publish redacted proof</button>
  </form>)}
  {saved&&<PublicCleanupProof key={String(saved)} reportId={reportId} />}
 </section>
}
