'use client'

import { useId, useRef, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import { updateReportValidation } from '@/lib/api/reports'

export default function ReportApprovalDialog({ report, onClose, onApproved }) {
  const id = useId()
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)
  const value = Number(score)
  const valid = score !== '' && Number.isInteger(value) && value >= 0 && value <= 100
  const level = !valid ? 'Not assigned' : value < 20 ? 'Minimal' : value < 40 ? 'Low' : value < 60 ? 'Moderate' : value < 80 ? 'High' : 'Critical'
  const alreadyApproved = report.validation_status === 'approved'

  const save = async event => {
    event.preventDefault()
    if (!valid || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await updateReportValidation(report.id, 'approved', value)
      if (result.report?.id !== report.id || result.report.validation_status !== 'approved' || result.report.severity_score !== value) {
        throw new Error('The server did not confirm the saved severity. Refresh the report before retrying.')
      }
      onApproved(result.report)
    } catch (error) {
      setError(error.message || 'The report could not be saved. Your selection is still here. Try again.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return <Dialog open onClose={onClose} dismissible={!saving} labelledBy={`${id}-title`}>
    <form onSubmit={save} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-text-primary" onClick={event => event.stopPropagation()} aria-busy={saving}>
      <h2 id={`${id}-title`} className="text-xl font-semibold">{alreadyApproved ? 'Set report severity' : 'Approve report'}</h2>
      <p className="mt-2 break-words text-sm text-text-secondary">{report.title}</p>
      <p id={`${id}-help`} className="mt-3 text-sm text-text-secondary">Assess the visible environmental impact. Choose a score from 0 to 100; a higher score means greater severity.</p>
      <label className="mt-5 block text-sm font-medium" htmlFor={`${id}-range`}>Severity score</label>
      <output className="mt-2 block text-lg font-semibold" aria-live="polite" htmlFor={`${id}-range ${id}-number`}>{valid ? `${value} / 100 · ${level}` : 'Not assigned'}</output>
      <input id={`${id}-range`} type="range" min="0" max="100" step="1" value={valid ? value : 50}
        onChange={event => setScore(event.target.value)} onPointerUp={event => setScore(event.currentTarget.value)}
        aria-describedby={`${id}-help`} aria-valuetext={valid ? `${value} out of 100, ${level}` : 'Not assigned. Adjust to choose a score.'}
        disabled={saving} className="mt-2 min-h-11 w-full accent-primary" />
      <div className="flex justify-between text-xs text-text-secondary"><span>0 · Minimal</span><span>100 · Critical</span></div>
      <label className="mt-4 block text-sm font-medium" htmlFor={`${id}-number`}>Exact score (0–100)</label>
      <input id={`${id}-number`} type="number" inputMode="numeric" min="0" max="100" step="1" required value={score}
        onChange={event => setScore(event.target.value)} disabled={saving} placeholder="Enter a score"
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary" />
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">Minimal 0–19 · Low 20–39 · Moderate 40–59 · High 60–79 · Critical 80–100</p>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondary min-h-11" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50" disabled={!valid || saving}>
          {saving ? 'Saving…' : alreadyApproved ? 'Save severity' : 'Approve and save severity'}
        </button>
      </div>
    </form>
  </Dialog>
}
