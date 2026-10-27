'use client'

import { useId, useRef, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import { updateReportValidation } from '@/lib/api/reports'

const REJECTION_PRESETS = [
  'Blurry, dark, or unrecognizable photo',
  'No visible environmental hazard or waste',
  'Duplicate submission of an existing report',
  'Outside Pasig City jurisdiction / invalid location',
  'Private property with no accessible public hazard',
  'Non-environmental or inappropriate content'
]

export default function ReportRejectionDialog({ report, onClose, onRejected }) {
  const id = useId()
  const [selectedPreset, setSelectedPreset] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  const effectiveReason = (customReason || selectedPreset).trim()
  const valid = effectiveReason.length > 0

  // Check if reporter requested manual review with explanation
  const citizenRequest = typeof report?.notes === 'string' && report.notes.startsWith('Reporter requested manual review:')
    ? report.notes.replace('Reporter requested manual review:', '').split('\n\nOfficer rejection reason:')[0].trim()
    : null

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset)
    if (!customReason) {
      setCustomReason(preset)
    }
  }

  const save = async (event) => {
    event.preventDefault()
    if (!valid || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await updateReportValidation(report.id, 'rejected', undefined, effectiveReason)
      if (result.report?.id !== report.id || result.report.validation_status !== 'rejected') {
        throw new Error('The server did not confirm the rejection. Refresh the report before retrying.')
      }
      onRejected(result.report, effectiveReason)
    } catch (err) {
      setError(err.message || 'Failed to reject report. Please try again.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} dismissible={!saving} labelledBy={`${id}-title`}>
      <form
        onSubmit={save}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 text-text-primary shadow-xl"
        onClick={(event) => event.stopPropagation()}
        aria-busy={saving}
      >
        <h2 id={`${id}-title`} className="text-xl font-semibold text-error">
          Reject report
        </h2>
        <p className="mt-2 break-words text-sm font-medium text-text-primary">
          {report.title}
        </p>

        {citizenRequest && (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-warning">Citizen manual review note:</span>
            <p className="mt-1 italic text-text-primary">{citizenRequest}</p>
          </div>
        )}

        <p id={`${id}-help`} className="mt-3 text-xs text-text-secondary">
          Select a common rejection reason or write a specific explanation. The citizen will see this reason in their app.
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-text-muted">
          Common reasons
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {REJECTION_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-error bg-error/10 text-error'
                    : 'border-border bg-surface-elevated text-text-secondary hover:border-border-focus hover:text-text-primary'
                }`}
                disabled={saving}
              >
                {preset}
              </button>
            )
          })}
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor={`${id}-reason`}>
          Detailed explanation for citizen <span className="text-error">*</span>
        </label>
        <textarea
          id={`${id}-reason`}
          rows={3}
          required
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          disabled={saving}
          placeholder="Provide details or instructions (e.g. Please capture a clearer photo showing the street sign or wider view of the waste)..."
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-error focus:outline-none focus:ring-1 focus:ring-error"
        />

        {error && <p role="alert" className="mt-3 text-xs text-error">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="btn-secondary min-h-10 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary min-h-10 bg-error hover:bg-error/90 border-error text-white text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!valid || saving}
          >
            {saving ? 'Rejecting report…' : 'Confirm rejection'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
