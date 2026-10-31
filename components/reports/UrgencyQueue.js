'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Check, TriangleAlert } from 'lucide-react'
import { useTask } from '@/components/context/TaskContext'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'
import { canApproveUrgency, urgencyDispatchSettings, urgencyReasonLabels } from '@/lib/urgency.mjs'
import useUrgencyQueue from './useUrgencyQueue'
import UrgencyDecisionDialog from './UrgencyDecisionDialog'
import styles from './UrgencyQueue.module.css'

const STATES = {
  pending: { label: 'Awaiting review', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'muted' },
}
const EMPTY = {
  pending: { title: 'Nothing is waiting for review', text: 'Urgent requests from citizens appear here as they arrive. This list refreshes every few seconds.' },
  approved: { title: 'No approved requests', text: 'Requests you approve appear here until their dispatch plan is prepared.' },
  declined: { title: 'No declined requests', text: 'Requests you decline are kept here with the reason you gave.' },
}
const FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['declined', 'Declined']]
const stateOf = report => report.needs_reverification
  ? { label: 'Needs re-verification', tone: 'warning' }
  : (STATES[report.urgency_status] || { label: report.urgency_status, tone: 'muted' })

// The same gates canApproveUrgency checks, listed so an officer can see which one blocks approval.
function approvalGates(report) {
  const hazard = ['suspected_hazard', 'hazmat_required', 'hazard_review'].includes(report.hazard_class)
  return [
    { key: 'reviewer', ok: report.review_allowed === true, done: 'Independent reviewer', blocked: 'Another officer must review your own report' },
    { key: 'lifecycle', ok: Boolean(report.sla_started_at), done: 'Lifecycle active', blocked: 'Activate the report lifecycle first' },
    { key: 'validated', ok: report.validation_status === 'approved', done: 'Report validated', blocked: 'Complete report validation' },
    { key: 'consent', ok: !report.on_private_property || report.property_owner_consent_status === 'obtained', done: report.on_private_property ? 'Owner consent obtained' : 'Public property', blocked: 'Property owner consent is needed' },
    { key: 'safety', ok: !hazard, done: 'Safety cleared', blocked: 'Safety review is needed' },
  ]
}

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
      <h2>{compact?'Urgent verification':'Requests'} {compact && queue.data && <span>({queue.data.total})</span>}</h2>
      {compact ? <Link href="/dashboard/officer/urgent-verification">View urgent queue</Link>
        : <button type="button" className="btn-secondary" onClick={()=>queue.refetch()} disabled={queue.isFetching}>Refresh queue</button>}
    </header>
    {!compact && <>
      <p>Approved urgency bypasses the maturation wait. Assignment and cleanup still require an available crew and a committed dispatch plan.</p>
      <div className={styles.filters} role="group" aria-label="Urgency status">
        {FILTERS.map(([value,label])=><button key={value} type="button" aria-pressed={status===value} onClick={()=>setStatus(value)}>
          {label}{status===value && queue.data ? ` (${queue.data.total})` : ''}</button>)}
      </div>
    </>}
    {queue.isPending && <p role="status">Loading urgent requests…</p>}
    {queue.isError && <p role="alert">{queue.data?'Urgency requests could not refresh. Previously loaded requests remain shown.':'Urgency requests could not load.'} <button type="button" onClick={()=>queue.refetch()}>Try again</button></p>}
    {error && <p role="alert">{error}</p>}
    {!queue.isPending && !queue.isError && !rows.length && (compact ? <p>No {status} urgent requests.</p> : <div className={styles.empty}>
      <h3>{EMPTY[status].title}</h3>
      <p>{EMPTY[status].text}</p>
      {status==='pending' && <button type="button" className={styles.reviewLink} onClick={()=>setStatus('approved')}>See approved requests</button>}
    </div>)}
    {isOptimizing && !compact && <p role="status">Preparing dispatch plan… {optimizationProgress?.message}</p>}
    <ul className={styles.list}>
      {rows.map(report=>{
        const state=stateOf(report)
        const reason=urgencyReasonLabels[report.priority_reason] || 'Urgent review requested'
        if (compact) return <li key={report.id} className={styles.report}>
          <div className={styles.header}>
            <h3><Link href={`/dashboard/raw-data/${report.id}`}>{report.title}</Link></h3>
            <span className={styles.state} data-tone={state.tone}>{state.label}</span>
          </div>
          <p>{reason}{report.priority_explanation && ` · ${report.priority_explanation}`}</p>
        </li>
        const gates=approvalGates(report)
        const waiting=report.urgency_status!=='approved' && gates.some(gate=>!gate.ok)
        return <li key={report.id} className={styles.report}>
          <div className={styles.rowHead}>
            <div className={styles.rowTitle}>
              <p className={styles.reason}>{reason}</p>
              <h3>{report.title}</h3>
            </div>
            <span className={styles.state} data-tone={state.tone}><i aria-hidden="true" />{state.label}</span>
          </div>
          {report.priority_explanation && <p className={styles.body}>{report.priority_explanation}</p>}
          {report.description && <p className={styles.body}>{report.description}</p>}
          {report.urgency_reason && <p className={styles.body}><strong>Last decision:</strong> {report.urgency_reason}</p>}
          {report.urgency_status==='approved' && !report.dispatchable && <p className={styles.body}>Not dispatchable yet. Review changed details or access restrictions, then verify again.</p>}
          <ul className={styles.gates} aria-label="Approval requirements">
            {gates.map(gate=><li key={gate.key} data-ok={gate.ok}>
              {gate.ok?<Check size={14} aria-hidden="true" />:<TriangleAlert size={14} aria-hidden="true" />}
              <span>{gate.ok?gate.done:gate.blocked}</span>
            </li>)}
          </ul>
          <div className={styles.actions}>
            {report.dispatchable
              ? <button type="button" className="btn-primary" disabled={isOptimizing} onClick={()=>prepare(report)}>Prepare dispatch</button>
              : <button type="button" className="btn-primary" disabled={!canApproveUrgency(report)} onClick={()=>setDecision({report,outcome:'approved'})}>
                  {report.urgency_status==='approved'?'Verify again':'Approve urgency'}</button>}
            {report.dispatchable && <button type="button" className="btn-secondary" disabled={!canApproveUrgency(report)} onClick={()=>setDecision({report,outcome:'approved'})}>Verify again</button>}
            {report.urgency_status!=='declined' && <button type="button" className="btn-secondary" disabled={report.review_allowed!==true} onClick={()=>setDecision({report,outcome:'declined'})}>Decline urgency</button>}
            <Link href={`/dashboard/raw-data/${report.id}`} className={styles.reviewLink}>Review report</Link>
            {waiting && <span className={styles.hint}>Approval unlocks when every requirement is clear.</span>}
          </div>
        </li>
      })}
    </ul>
    {!compact && queue.data?.total>rows.length && <p>Showing the oldest {rows.length} of {queue.data.total}. Review these requests to advance the queue.</p>}
    {decision && <UrgencyDecisionDialog key={draftKey} {...decision} initialReason={draftReasons[draftKey] ?? ''}
      onReasonChange={reason=>setDraftReasons(previous=>({...previous,[draftKey]:reason}))} onClose={()=>setDecision(null)} onSaved={saved} />}
  </section>
}
