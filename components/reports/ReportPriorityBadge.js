import { citizenPriorityLabel } from '@/lib/urgency.mjs'

export default function ReportPriorityBadge({ priority }) {
  const label = citizenPriorityLabel(priority)
  const urgent = label === 'Urgent'
  return <span data-report-priority className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium"
    style={{ color: urgent ? 'var(--error)' : 'var(--text-secondary)', background: 'var(--surface)', borderColor: 'currentColor' }}
    title="Citizen-selected priority. Urgent requests still require SWMO verification; this is separate from severity and response status.">
    Citizen priority: {label}
  </span>
}
