'use client'
import {
  getReportStatusColor,
  getValidationStatusColor,
  getLifecycleStageColor,
  getTaskStatusColor,
  getSeverityColor,
  getClusterStatusColor,
  getAuditActionColor,
  getResponseActionColor,
  getRoleBadgeColor,
  getConsentStatusColor,
  formatStatusLabel,
  formatActionLabel
} from '@/lib/helpers/statusHelpers'

/**
 * Universal Status Badge component for consistent status display
 */
export default function StatusBadge({
  status,
  type = 'report', // report, validation, lifecycle, task, severity, cluster, auditAction, responseAction, role, consent
  label,
  size = 'small', // small, medium, large
  className = ''
}) {
  let colorClass = ''
  let displayLabel = label

  switch (type) {
    case 'report':
      colorClass = getReportStatusColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    case 'validation':
      colorClass = getValidationStatusColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    case 'lifecycle':
      colorClass = getLifecycleStageColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    case 'task':
      colorClass = getTaskStatusColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    case 'severity':
      colorClass = getSeverityColor(status)
      displayLabel = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A')
      break
    case 'cluster':
      colorClass = getClusterStatusColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    case 'auditAction':
      colorClass = getAuditActionColor(status)
      displayLabel = label || formatActionLabel(status)
      break
    case 'responseAction':
      colorClass = getResponseActionColor(status)
      displayLabel = label || formatActionLabel(status)
      break
    case 'role':
      colorClass = getRoleBadgeColor(status)
      displayLabel = label || (status ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A')
      break
    case 'consent':
      colorClass = getConsentStatusColor(status)
      displayLabel = label || formatStatusLabel(status)
      break
    default:
      colorClass = 'bg-surface text-text-muted border-border'
      displayLabel = label || formatStatusLabel(status)
  }

  const sizeClasses = {
    small: 'px-2 py-1 rounded text-xs',
    medium: 'px-3 py-1.5 rounded text-sm',
    large: 'px-4 py-2 rounded text-sm'
  }

  return (
    <span className={`${sizeClasses[size]} font-semibold border whitespace-nowrap ${colorClass} ${className}`}>
      {displayLabel}
    </span>
  )
}