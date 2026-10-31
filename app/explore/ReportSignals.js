import { getReportStatusHex } from '@/lib/helpers/statusHelpers'

const SEVERITY_LEVEL = { low: 1, medium: 2, moderate: 2, high: 3, critical: 3 }
const LIFECYCLE_STEP = {
  in_progress: 1, acknowledged: 1, pending_owner_consent: 1, waiting_for_feedback: 1, responded: 1,
  resolved: 2, closed: 2,
}
const STEPS = ['Reported', 'In progress', 'Resolved']
const label = value => String(value || '').replace(/_/g, ' ')

const SEVERITY_TONE = { 1: 'var(--success)', 2: 'var(--warning)', 3: 'var(--error)' }

// Three ascending bars plus a captioned word: height and text carry the level, the token color reinforces it.
export function SeverityMeter({ severity }) {
  if (!severity) return null
  const level = SEVERITY_LEVEL[String(severity).toLowerCase()] || 1
  const tone = SEVERITY_TONE[level]
  return <span className="inline-flex items-end gap-2" role="img" aria-label={`Severity: ${label(severity)}`}>
    <span className="inline-flex items-end gap-0.5 pb-0.5" aria-hidden="true">
      {[6, 10, 14].map((height, index) => <span key={height} className="w-1 rounded-sm" style={{ height, backgroundColor: index < level ? tone : 'var(--landing-border)' }} />)}
    </span>
    <span className="flex flex-col leading-tight">
      <span className="text-[11px] text-[var(--landing-muted)]">Severity</span>
      <span className="text-xs font-medium capitalize" style={{ color: tone }}>{label(severity)}</span>
    </span>
  </span>
}

// Three-step track: steps already passed are filled, the current one takes the canonical status color.
export function LifecycleTrack({ status }) {
  const step = LIFECYCLE_STEP[status] ?? 0
  const color = getReportStatusHex(status)
  return <span className="inline-flex items-center gap-2" role="img" aria-label={`${label(status || 'unresolved')}. Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
    <span className="inline-flex items-center" aria-hidden="true">
      {STEPS.map((name, index) => <span key={name} className="inline-flex items-center">
        {index > 0 && <span className="h-px w-3" style={{ backgroundColor: index <= step ? color : 'var(--landing-border)' }} />}
        <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: index <= step ? color : 'var(--landing-border)', backgroundColor: index <= step ? color : 'transparent' }} />
      </span>)}
    </span>
    <span className="flex flex-col leading-tight">
      <span className="text-[11px] text-[var(--landing-muted)]">Status</span>
      <span className="text-xs font-medium capitalize">{label(status || 'unresolved')}</span>
    </span>
  </span>
}

// Score as a number on a hairline 0-100 scale; the fill is the only mark, so nothing leans on color.
export function SeverityScore({ score }) {
  const value = Number(score)
  if (score === null || score === undefined || Number.isNaN(value)) return null
  const percent = Math.max(0, Math.min(100, value > 5 ? value : value * 20))
  return <div className="shrink-0 w-24 text-right" role="img" aria-label={`Severity ${Math.round(percent)} out of 100`}>
    <span className="block text-xs text-[var(--landing-muted)]">Severity</span>
    <span className="block text-base font-medium tabular-nums text-[var(--landing-text)] leading-tight">{Math.round(percent)}<span className="text-xs font-normal text-[var(--landing-muted)]"> / 100</span></span>
    <span className="block mt-1.5 h-0.5 rounded-full bg-[var(--landing-border)]" aria-hidden="true">
      <span className="block h-full rounded-full bg-[var(--landing-text)]" style={{ width: `${percent}%` }} />
    </span>
  </div>
}
