'use client'
import {useEffect,useState} from 'react'
import {backendFetch} from '@/lib/backend-fetch.mjs'
import SecureImage from '@/components/ui/SecureImage'

export default function PublicCleanupProof({reportId}) {
 const [result,setResult]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{
  const controller=new AbortController()
  backendFetch(`/api/backend/api/reports/${encodeURIComponent(reportId)}/cleanup-proof/public`,{signal:controller.signal})
   .then(r=>{if(!r.ok)throw new Error();return r.json()})
   .then(data=>{if(!controller.signal.aborted){setResult({reportId,proof:data.proof});setError(false)}})
   .catch(()=>{if(!controller.signal.aborted)setError(true)})
  return ()=>controller.abort()
 },[reportId,retry])
 const proof=result?.reportId===reportId?result.proof:null
 return <section aria-label="Verified cleanup proof" className="space-y-3">
  <h3 className="font-semibold">Verified cleanup proof</h3>
  {error?<div role="alert"><p>Cleanup proof could not load.</p><button className="btn-secondary" onClick={()=>setRetry(n=>n+1)}>Retry cleanup proof</button></div>
   :!result||result.reportId!==reportId?<p role="status">Loading cleanup proof…</p>
   :!proof?<p className="text-sm text-text-secondary">No officer-approved public cleanup proof is available yet.</p>
   :<>
    <p className="text-sm whitespace-pre-wrap">{proof.public_notes}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{['before','after'].map(slot=><figure key={slot}>
     {/* Only this publication endpoint serves redacted pixels; never substitute report originals. */}
     <SecureImage src={`/api/backend${proof[`${slot}_url`]}`} alt={`${slot==='before'?'Before':'After'} cleanup, privacy reviewed`} className="w-full rounded-lg" loading="lazy" />
     <figcaption className="text-sm capitalize">{slot} cleanup</figcaption>
    </figure>)}</div>
    <p className="text-xs text-text-secondary">Completed: {new Date(proof.completed_at).toLocaleString()}. Verified: {new Date(proof.verified_at).toLocaleString()}. Sensitive details are covered in these public copies.</p>
   </>}
 </section>
}
