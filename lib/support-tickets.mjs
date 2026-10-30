export const ticketCategoryLabels = {
  status_inquiry: 'Status inquiry',
  location_mismatch: 'Location correction',
  re_inspection: 'Re-inspection request',
  hazard_escalation: 'Hazard escalation',
  account_help: 'Account help',
  other: 'Other',
}

export const ticketStatusLabels = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const ticketQueueFilters = ['open', 'in_progress', 'resolved', 'closed']
export const ticketReplyStatuses = ['in_progress', 'resolved', 'closed']

export function ticketCategoryLabel(category) {
  return ticketCategoryLabels[category] || 'Other'
}

export function ticketStatusLabel(status) {
  return ticketStatusLabels[status] || 'Open'
}

// The queue endpoint pages oldest-first; the cursor it returns is the last row shown.
export function ticketQueueQuery({ status, cursor, limit = 20 }) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (status) params.set('status', status)
  if (cursor) {
    params.set('before_created', cursor.created_at)
    params.set('before_id', cursor.id)
  }
  return params.toString()
}
