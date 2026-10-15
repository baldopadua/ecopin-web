'use client'
import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, RotateCcw, XCircle, Loader2, ShieldAlert, ListFilter, X } from 'lucide-react'
import { previewPlanDisassembly, disassemblePlan } from '@/lib/api/optimization'
import Dialog from '@/components/ui/Dialog'
import styles from './OptimizationFeedback.module.css'

export default function DisassembleModal({ isOpen, targetId, onClose, onDisassembled }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])
  useEffect(() => {
    if (!isOpen || !targetId) return

    let isCancelled = false
    queueMicrotask(() => {
      if (!isCancelled) {
        setLoading(true)
        setError(null)
        setPreview(null)
      }
    })

    previewPlanDisassembly(targetId)
      .then((data) => {
        if (!isCancelled) {
          setPreview(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Disassembly preview error:', err)
          setError(err.message || 'Failed to fetch disassembly preview')
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, targetId])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!targetId || submitting || (preview && !preview.can_disassemble)) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await disassemblePlan(targetId)
      if (onDisassembled) {
        onDisassembled(result)
      }
      onClose()
    } catch (err) {
      console.error('Failed to disassemble plan:', err)
      setError(err.message || 'Failed to disassemble plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="disassemble-title" dismissible={!submitting}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.dangerIcon}><RotateCcw size={24} aria-hidden="true" /></span>
          <div className={styles.heading}>
            <h2 id="disassemble-title">Disassemble and reset plan</h2>
            <p>Target ID: <code>{targetId}</code></p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className={styles.close} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>
        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-text-muted space-y-3 font-sans text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Auditing plan tasks, reports, and cluster locks...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className={styles.error}>
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview Content */}
        {!loading && preview && (
          <div className="space-y-4">
            {/* Blocking Warning if tasks already completed */}
            {!preview.can_disassemble && (
              <div className={styles.error}>
                <div className="flex items-center gap-2 text-error font-semibold text-sm normal-case">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  Disassembly unavailable
                </div>
                <p className="text-xs font-sans text-error">
                  {preview.blocking_reason}
                </p>
                <p className="text-xs text-text-muted pt-1">
                  Plans cannot be disassembled once field crews have completed physical tasks on site.
                </p>
              </div>
            )}

            {/* In-progress warning banner */}
            {preview.can_disassemble && preview.in_progress_tasks_count > 0 && (
              <div className={styles.warning}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Notice: {preview.in_progress_tasks_count} task(s) are currently marked in progress by field crews. Disassembling will recall and revoke them.
                </span>
              </div>
            )}

            {/* General explanation */}
            <p className="text-xs text-text-secondary leading-relaxed">
              {preview.is_committed
                ? 'Disassembling this plan will permanently undo all created cleanup tasks, clear crew routes, and restore all assigned reports and clusters back to the unassigned backlog queue in their original state.'
                : 'This draft dispatch proposal has not been dispatched to crews yet. Resetting will discard the draft and return all evaluated items to the backlog pool.'}
            </p>

            {/* Metrics Breakdown Grid */}
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Tasks undone</p>
                <p className="text-xl font-semibold text-error">{preview.tasks_count}</p>
                <p className="text-xs font-sans text-text-muted mt-0.5">Cleanup tasks removed</p>
              </div>
              <div className={styles.metric}>
                <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Reports restored</p>
                <p className="text-xl font-semibold text-primary">{preview.reports_count}</p>
                <p className="text-xs font-sans text-text-muted mt-0.5">Reset to unresolved queue</p>
              </div>
              <div className={styles.metric}>
                <p className="text-xs font-sans normal-case tracking-normal text-text-muted">Clusters restored</p>
                <p className="text-xl font-semibold text-info">{preview.clusters_count}</p>
                <p className="text-xs font-sans text-text-muted mt-0.5">Back to queued/prioritized</p>
              </div>
            </div>

            {/* Tasks Detail List if tasks exist */}
            {preview.tasks?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold normal-case tracking-normal text-text-muted mb-2 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5" />
                  Tasks to be disassembled ({preview.tasks.length}):
                </h4>
                <div className="max-h-44 overflow-y-auto border border-border bg-surface divide-y divide-border/40 text-xs font-sans">
                  {preview.tasks.map((task) => (
                    <div key={task.id} className="p-2.5 flex items-center justify-between hover:bg-surface-elevated">
                      <div>
                        <span className="font-semibold text-text-primary">{task.title}</span>
                        <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                          <span>Crew: <span className="text-text-primary">{task.crew_name}</span></span>
                          <span>·</span>
                          <span>{task.reports_count} report(s)</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold normal-case border ${
                        task.status === 'completed' ? 'bg-success/10 text-success border-success' :
                        task.status === 'in_progress' ? 'bg-warning/10 text-warning border-warning' :
                        'bg-surface-elevated text-text-muted border-border'
                      }`}>
                        {task.status?.replaceAll('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        </div>
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={styles.secondary} ref={cancelRef}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || submitting || !preview?.can_disassemble}
            className={styles.danger}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Disassembling plan…
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" /> Disassemble and restore backlog
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
