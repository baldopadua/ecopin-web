'use client'
import { useEffect, useId, useRef, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import { decideUrgency } from '@/lib/api/urgency'
import styles from './UrgencyQueue.module.css'

export default function UrgencyDecisionDialog({report,outcome,onClose,onSaved,initialReason='',onReasonChange}) {
  const [reason,setReason]=useState(initialReason)
  const [error,setError]=useState(null)
  const [saving,setSaving]=useState(false)
  const attempt=useRef(null)
  const controller=useRef(null)
  const titleId=useId(),reasonId=useId()
  useEffect(()=>()=>controller.current?.abort(),[])
  const submit=async event=>{
    event.preventDefault()
    if (saving || reason.trim().length<3) return
    const payload={outcome,reason:reason.trim(),expected_decision_id:report.urgency_decision_id ?? null}
    const key=JSON.stringify(payload)
    if (attempt.current?.key!==key) attempt.current={key,id:crypto.randomUUID()}
    controller.current=new AbortController()
    setSaving(true);setError(null)
    try {
      await decideUrgency(report.id,{...payload,operation_id:attempt.current.id},{signal:controller.current.signal})
      if (!controller.current.signal.aborted) onSaved()
    } catch(err) {
      if (!controller.current.signal.aborted) setError(err.status===409
        ? 'The review changed. Close this dialog, refresh the queue and reopen the current request. Your reason will be retained.'
        : err.message || 'Decision was not confirmed. Your reason is still here; retry or refresh the queue.')
    } finally {
      if (!controller.current.signal.aborted) setSaving(false)
    }
  }
  return <Dialog open labelledBy={titleId} onClose={onClose} dismissible={!saving} className={styles.dialog}>
    <form onSubmit={submit} className={styles.decision}>
      <h2 id={titleId}>{outcome==='approved'?'Approve urgency':'Decline urgency'}</h2>
      <p><strong>{report.title}</strong></p>
      <p>{outcome==='approved'
        ? 'Approval removes the maturation wait. You will still review and commit a dispatch plan; crew availability and safety checks apply.'
        : 'This keeps the normal maturation rules. Declining urgency does not reduce citizen trust or mark a false claim.'}</p>
      <label htmlFor={reasonId}>Verification reason (required)</label>
      <textarea id={reasonId} rows={4} maxLength={1000} required disabled={saving} value={reason} onChange={event=>{setReason(event.target.value);onReasonChange?.(event.target.value)}} />
      {error && <p role="alert">{error} Your reason is retained.</p>}
      <div className={styles.actions}>
        <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving || reason.trim().length<3}>
          {saving?'Saving…':outcome==='approved'?'Approve urgency':'Decline urgency'}
        </button>
      </div>
    </form>
  </Dialog>
}
