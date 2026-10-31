'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTask } from '@/components/context/TaskContext'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'
import { canApproveUrgency, urgencyDispatchSettings, urgencyReasonLabels } from '@/lib/urgency.mjs'
import useUrgencyQueue from './useUrgencyQueue'
import UrgencyDecisionDialog from './UrgencyDecisionDialog'
import styles from './UrgencyQueue.module.css'

export default function UrgencyQueue({compact=false}) {
  const [status,setStatus]=useState('pending')
  const [decision,setDecision]=useState(null)
  const [draftReasons,setDraftReasons]=useState({})
  const [error,setError]=useState(null)
  const queue=useUrgencyQueue(status)
  const client=useQueryClient()
  const router=useRouter()
  const {isOptimizing,optimizationProgress,startOptimization}=useTask()
  const rows=(queue.data?.reports ?? []).slice(0,compact?3:50)
  const draftKey=decision?`${decision.report.id}:${decision.outcome}`:null
  const saved=()=>{ setDraftReasons(previous=>{const next={...previous};delete next[draftKey];return next});setDecision(null);void client.invalidateQueries({queryKey:DASHBOARD_QUERY_KEY}) }
  const prepare=report=>{
    setError(null)
    void startOptimization(urgencyDispatchSettings(report),result=>{
      if (result.selectedCount>0) router.push('/dashboard/officer/optimization')
      else setError('No dispatchable work could be planned. Review capacity, access and the current approval, then try again.')
    },err=>setError(err.message || 'Could not prepare a dispatch plan.'))
  }
  if (compact && !queue.isPending && !queue.isError && !queue.data?.total) return null
  return <section className={`${styles.panel} ${compact?styles.compact:''}`} aria-label="Urgent verification queue">
    <header className={styles.header}>
      <h2>{compact?'Urgent verification':'Requests'} {queue.data && <span>({queue.data.total})</span>}</h2>
      {compact ? <Link href="/dashboard/officer/urgent-verification">View urgent queue</Link>
        : <button type="button" className="btn-secondary" onClick={()=>queue.refetch()} disabled={queue.isFetching}>Refresh queue</button>}
    </header>
    {!compact && <>
      <p>Approved urgency bypasses the maturation wait. Assignment and cleanup still require an available crew and a committed dispatch plan.</p>
      <div className={styles.filters} role="group" aria-label="Urgency status">
        {['pending','approved','declined'].map(value=><button key={value} type="button" aria-pressed={status===value}
          className={status===value?'btn-primary':'btn-secondary'} onClick={()=>setStatus(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}
      </div>
    </>}
    {queue.isPending && <p role="status">Loading urgent requests…</p>}
    {queue.isError && <p role="alert">{queue.data?'Urgency requests could not refresh. Previously loaded requests remain shown.':'Urgency requests could not load.'} <button type="button" onClick={()=>queue.refetch()}>Try again</button></p>}
    {error && <p role="alert">{error}</p>}
    {!queue.isPending && !queue.isError && !rows.length && <p>No {status} urgent requests.</p>}
    {isOptimizing && !compact && <p role="status">Preparing dispatch plan… {optimizationProgress?.message}</p>}
    <ul className={styles.list}>
      {rows.map(report=><li key={report.id} className={styles.report}>
        <div className={styles.header}>
          <h3>{compact?<Link href={`/dashboard/raw-data/${report.id}`}>{report.title}</Link>:report.title}</h3>
          <span className={styles.status}>{report.needs_reverification?'Needs re-verification':report.urgency_status==='pending'?'Awaiting officer review':report.urgency_status}</span>
        </div>
        <p>{urgencyReasonLabels[report.priority_reason] || 'Urgent review requested'}{report.priority_explanation && ` · ${report.priority_explanation}`}</p>
        {!compact && <>
          {report.description && <p>{report.description}</p>}
          {report.urgency_reason && <p><strong>Last decision:</strong> {report.urgency_reason}</p>}
          {report.review_allowed===false && <p>Another officer must review your own report.</p>}
          {!report.sla_started_at && <p>Report lifecycle must be activated before urgency approval.</p>}
          {!canApproveUrgency(report) && report.review_allowed && report.sla_started_at && <p>Complete report validation, property consent and safety review before urgency approval.</p>}
          {report.urgency_status==='approved' && !report.dispatchable && <p>Not dispatchable yet. Review changed details or access restrictions, then verify again.</p>}
          <div className={styles.actions}>
            <Link href={`/dashboard/raw-data/${report.id}`} className="btn-secondary">Review report</Link>
            <button type="button" className="btn-secondary" disabled={!canApproveUrgency(report)} onClick={()=>setDecision({report,outcome:'approved'})}>
              {report.urgency_status==='approved'?'Verify again':'Approve urgency'}
            </button>
            {report.urgency_status!=='declined' && <button type="button" className="btn-secondary" disabled={report.review_allowed!==true} onClick={()=>setDecision({report,outcome:'declined'})}>Decline urgency</button>}
            {report.dispatchable && <button type="button" className="btn-primary" disabled={isOptimizing} onClick={()=>prepare(report)}>Prepare dispatch</button>}
          </div>
        </>}
      </li>)}
    </ul>
    {!compact && queue.data?.total>rows.length && <p>Showing the oldest {rows.length} of {queue.data.total}. Review these requests to advance the queue.</p>}
    {decision && <UrgencyDecisionDialog key={draftKey} {...decision} initialReason={draftReasons[draftKey] ?? ''}
      onReasonChange={reason=>setDraftReasons(previous=>({...previous,[draftKey]:reason}))} onClose={()=>setDecision(null)} onSaved={saved} />}
  </section>
}

