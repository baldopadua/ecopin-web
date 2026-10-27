export const REPORT_LIFECYCLE_STAGES = [
  ['submitted', 'Submitted'],
  ['assigned', 'Assigned'],
  ['acknowledged', 'Acknowledged'],
  ['in_progress', 'In progress'],
  ['responded', 'Responded'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
]

const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : ''

export function getReportLifecycleStage(report) {
  const status = normalize(report.status)
  // Closure and field resolution update status without always updating the crew stage.
  if (status === 'closed') return 'closed'
  if (status === 'resolved' || status === 'waiting_for_feedback') return 'resolved'

  const stage = [report.stage, report.lifecycle_stage].map(normalize)
    .find(value => REPORT_LIFECYCLE_STAGES.some(([stage]) => stage === value))
  if (status === 'in_progress' && stage !== 'in_progress' && stage !== 'responded') return 'in_progress'
  if (normalize(report.lifecycle_state) === 'dispatched' && (!stage || stage === 'submitted')) return 'assigned'
  return stage || null
}
