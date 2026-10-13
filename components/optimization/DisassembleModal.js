'use client'
import React, { useState, useEffect } from 'react'
import { AlertTriangle, RotateCcw, XCircle, CheckCircle2, Loader2, ArrowRight, ShieldAlert, ListFilter } from 'lucide-react'
import { previewPlanDisassembly, disassemblePlan } from '@/lib/api/optimization'

export default function DisassembleModal({ isOpen, targetId, onClose, onDisassembled }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

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
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-border border-error/50 max-w-2xl w-full p-6 shadow-[8px_8px_0px_0px_#EF4444] text-text-primary animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-error/10 border border-error text-error">
              <RotateCcw className="w-6 h-6 animate-spin-reverse" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-text-primary flex items-center gap-2">
                Disassemble & Reset Plan
              </h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                Target ID: <span className="text-text-primary font-bold">{targetId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-text-muted hover:text-text-primary p-1 text-sm font-mono"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-text-muted space-y-3 font-mono text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Auditing plan tasks, reports, and cluster locks...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 bg-error/10 border border-error text-error text-xs font-mono flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview Content */}
        {!loading && preview && (
          <div className="space-y-4">
            {/* Blocking Warning if tasks already completed */}
            {!preview.can_disassemble && (
              <div className="p-4 bg-error/15 border-2 border-error text-text-primary space-y-1">
                <div className="flex items-center gap-2 text-error font-bold text-sm uppercase">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  Disassembly Prohibited
                </div>
                <p className="text-xs font-mono text-error">
                  {preview.blocking_reason}
                </p>
                <p className="text-[11px] text-text-muted pt-1">
                  Plans cannot be disassembled once field crews have completed physical tasks on site.
                </p>
              </div>
            )}

            {/* In-progress warning banner */}
            {preview.can_disassemble && preview.in_progress_tasks_count > 0 && (
              <div className="p-3 bg-warning/15 border border-warning text-warning text-xs font-mono flex items-center gap-2">
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Tasks Undone</p>
                <p className="text-xl font-bold text-error">{preview.tasks_count}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">Cleanup tasks removed</p>
              </div>
              <div className="bg-surface border border-border p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Reports Restored</p>
                <p className="text-xl font-bold text-primary">{preview.reports_count}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">Reset to unresolved queue</p>
              </div>
              <div className="bg-surface border border-border p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Clusters Restored</p>
                <p className="text-xl font-bold text-sky-400">{preview.clusters_count}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">Back to queued/prioritized</p>
              </div>
            </div>

            {/* Tasks Detail List if tasks exist */}
            {preview.tasks?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5" />
                  Tasks to be Disassembled ({preview.tasks.length}):
                </h4>
                <div className="max-h-44 overflow-y-auto border border-border bg-surface divide-y divide-border/40 text-xs font-mono">
                  {preview.tasks.map((task) => (
                    <div key={task.id} className="p-2.5 flex items-center justify-between hover:bg-surface-elevated">
                      <div>
                        <span className="font-bold text-text-primary">{task.title}</span>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>Crew: <span className="text-text-primary">{task.crew_name}</span></span>
                          <span>·</span>
                          <span>{task.reports_count} report(s)</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        task.status === 'completed' ? 'bg-success/10 text-success border-success' :
                        task.status === 'in_progress' ? 'bg-warning/10 text-warning border-warning' :
                        'bg-surface-elevated text-text-muted border-border'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-5 mt-5 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-border bg-surface text-text-primary font-bold uppercase tracking-wider text-xs hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || submitting || (preview && !preview.can_disassemble)}
            className="flex-1 py-2.5 bg-error text-white font-bold uppercase tracking-wider text-xs border border-error hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Disassembling Plan...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" /> Confirm Disassembly & Reset Backlog
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
