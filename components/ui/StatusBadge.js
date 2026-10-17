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
  getLocationVerificationColor,
  formatLocationVerificationLabel,
  formatStatusLabel,
  formatActionLabel
} from '@/lib/helpers/statusHelpers'

/**
 * Universal Status Badge component for consistent status display
 */
export default function StatusBadge({
  status,
  type = 'report', // report, validation, lifecycle, task, severity, cluster, auditAction, responseAction, role, consent, location_verification
  label,
  distanceMeters,
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
      displayLabel = label || formatValidationStatusLabel(status)
      break
    case 'lifecycle':
      colorClass = getLifecycleStageColor(status)
      displayLabel = label || formatLifecycleStageLabel(status)
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
    case 'location_verification':
      colorClass = getLocationVerificationColor(status)
      displayLabel = label || formatLocationVerificationLabel(status, distanceMeters)
      break
    default:
      colorClass = 'bg-surface-elevated text-text-muted border-border'
      displayLabel = label || formatStatusLabel(status)
  }

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-4 py-1.5 text-base'
  }

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border border-current max-w-full ${colorClass} ${className}`}>
      <span className="break-words">{displayLabel}</span>
    </span>
  )
}
