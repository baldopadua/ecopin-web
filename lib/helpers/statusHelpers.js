/**
 * Status helper functions for consistent status styling across the application
 */

/**
 * Get color classes for report status
 */
export function getReportStatusColor(status) {
  switch (status) {
    case 'resolved':
      return 'text-success border-current bg-transparent'
    case 'responded':
      return 'text-purple border-current bg-transparent'
    case 'acknowledged':
      return 'text-info border-current bg-transparent'
    case 'in_progress':
      return 'text-warning border-current bg-transparent'
    case 'waiting_for_feedback':
      return 'text-purple border-current bg-transparent'
    case 'closed':
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
    case 'pending_owner_consent':
      return 'text-info border-current bg-transparent'
    default:
      return 'text-error border-current bg-transparent'
  }
}

/**
 * Get color classes for validation status
 */
export function getValidationStatusColor(status) {
  switch (status) {
    case 'validated':
    case 'automatically_valid':
    case 'approved':
      return 'text-success border-current bg-transparent'
    case 'pending':
    case 'pending_ai_validation':
      return 'text-warning border-current bg-transparent'
    case 'manual_review':
    case 'Manual_Review':
      return 'text-purple border-current bg-transparent'
    case 'rejected':
      return 'text-error border-current bg-transparent'
    default:
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
  }
}

/**
 * Get color classes for lifecycle stage
 */
export function getLifecycleStageColor(stage) {
  switch (stage) {
    case 'submitted':
      return 'text-purple border-current bg-transparent'
    case 'assigned':
    case 'in_progress':
      return 'text-warning border-current bg-transparent'
    case 'resolved':
      return 'text-success border-current bg-transparent'
    case 'closed':
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
    default:
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
  }
}

/**
 * Get color classes for cleanup task status
 */
export function getTaskStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'text-success border-current bg-transparent'
    case 'en_route':
      return 'text-amber-500 border-current bg-transparent'
    case 'assigned':
      return 'text-blue-500 border-current bg-transparent'
    case 'in_progress':
      return 'text-warning border-current bg-transparent'
    case 'pending':
      return 'text-info border-current bg-transparent'
    case 'created':
      return 'text-purple border-current bg-transparent'
    case 'cancelled':
      return 'text-gray-500 border-current bg-transparent'
    default:
      return 'text-info border-current bg-transparent'
  }
}

/**
 * Get color classes for cluster severity
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case 'high':
      return 'text-error border-current bg-transparent'
    case 'medium':
      return 'text-warning border-current bg-transparent'
    case 'low':
      return 'text-info border-current bg-transparent'
    default:
      return 'text-gray-500 border-current bg-transparent'
  }
}

/**
 * Get color classes for cluster status
 */
export function getClusterStatusColor(status) {
  switch (status) {
    case 'resolved':
      return 'text-success border-current bg-transparent'
    case 'in_progress':
      return 'text-warning border-current bg-transparent'
    case 'waiting_for_feedback':
      return 'text-info border-current bg-transparent'
    case 'closed':
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
    case 'pending_owner_consent':
      return 'text-warning border-current bg-transparent'
    default:
      return 'text-error border-current bg-transparent'
  }
}

/**
 * Get color classes for audit log action types
 */
export function getAuditActionColor(actionType) {
  switch (actionType) {
    case 'login':
      return 'text-green-700 dark:text-green-300 border-current bg-transparent'
    case 'logout':
      return 'text-rose-600 dark:text-rose-300 border-current bg-transparent'
    case 'password_change':
      return 'text-orange-600 dark:text-orange-300 border-current bg-transparent'
    case 'password_reset':
      return 'text-yellow-700 dark:text-yellow-300 border-current bg-transparent'
    case 'profile_update':
      return 'text-purple-600 dark:text-purple-300 border-current bg-transparent'
    case 'user_created':
      return 'text-teal-600 dark:text-teal-300 border-current bg-transparent'
    case 'account_deletion':
      return 'text-red-600 dark:text-red-300 border-current bg-transparent'
    default:
      return 'text-gray-500 border-current bg-transparent'
  }
}

/**
 * Get color classes for response log action types
 */
export function getResponseActionColor(actionType) {
  switch (actionType) {
    case 'status_update':
      return 'text-info border-current bg-transparent'
    case 'lifecycle_stage_update':
      return 'text-purple border-current bg-transparent'
    case 'acknowledge_complaint':
    case 'lgu_resolve':
      return 'text-success border-current bg-transparent'
    case 'manual_note':
      return 'text-warning border-current bg-transparent'
    case 'citizen_close':
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
    case 'login':
      return 'text-success border-current bg-transparent'
    case 'password_change':
      return 'text-warning border-current bg-transparent'
    default:
      return 'text-gray-500 border-current bg-transparent'
  }
}

/**
 * Get color classes for user roles
 */
export function getRoleBadgeColor(role) {
  switch (role) {
    case 'admin':
      return 'text-purple border-current bg-transparent'
    case 'officer':
      return 'text-info border-current bg-transparent'
    case 'field_crew':
      return 'text-warning border-current bg-transparent'
    case 'citizen':
    default:
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
  }
}

/**
 * Format status label for display
 */
export function formatStatusLabel(status) {
  if (status === 'en_route') return 'En Route'
  return status ? status.replace(/_/g, ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase()) : 'Not available'
}

/**
 * Format lifecycle stage with clear operational semantics
 * (submitted -> Logged, assigned -> Dispatched, in_progress -> Action In Progress, resolved -> Field Resolved, closed -> Closed)
 */
export function formatLifecycleStageLabel(stage) {
  if (!stage) return 'Not available'
  const normalized = stage.toLowerCase().trim()
  switch (normalized) {
    case 'submitted':
      return 'Operational: Logged'
    case 'assigned':
      return 'Operational: Dispatched'
    case 'in_progress':
      return 'Operational: In Progress'
    case 'resolved':
      return 'Operational: Field Resolved'
    case 'closed':
      return 'Operational: Closed'
    default:
      return `Operational: ${formatStatusLabel(stage)}`
  }
}

/**
 * Format validation / review status label with clear citizen review semantics
 */
export function formatValidationStatusLabel(status) {
  if (!status) return 'Not available'
  const normalized = status.toLowerCase().trim()
  switch (normalized) {
    case 'approved':
    case 'validated':
    case 'automatically_valid':
      return 'Review: Approved'
    case 'pending':
    case 'pending_ai_validation':
      return 'Review: Pending AI'
    case 'manual_review':
      return 'Review: Manual Moderation'
    case 'rejected':
      return 'Review: Rejected'
    default:
      return `Review: ${formatStatusLabel(status)}`
  }
}

/**
 * Format citizen resolution / report status label with clear citizen-facing resolution semantics
 */
export function formatReportStatusLabel(status) {
  if (!status) return 'Not available'
  const normalized = status.toLowerCase().trim()
  switch (normalized) {
    case 'unresolved':
      return 'Status: Unresolved'
    case 'in_progress':
      return 'Status: In Progress'
    case 'resolved':
      return 'Status: Resolved'
    case 'closed':
      return 'Status: Closed'
    case 'pending_owner_consent':
      return 'Status: Awaiting Consent'
    case 'waiting_for_feedback':
      return 'Status: Awaiting Feedback'
    default:
      return `Status: ${formatStatusLabel(status)}`
  }
}

/**
 * Format action type label for display
 */
export function formatActionLabel(actionType) {
  return actionType ? actionType.replace(/_/g, ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase()) : 'Not available'
}

/**
 * Get color classes for property owner consent status
 */
export function getConsentStatusColor(status) {
  switch (status) {
    case 'obtained':
      return 'text-success border-current bg-transparent'
    case 'pending':
      return 'text-warning border-current bg-transparent'
    case 'denied':
      return 'text-error border-current bg-transparent'
    default:
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
  }
}

/**
 * Get color classes for photo location verification status
 */
export function getLocationVerificationColor(status) {
  switch (status) {
    case 'verified_on_site':
      return 'text-emerald-600 dark:text-emerald-400 border-current bg-transparent'
    case 'nearby_approximate':
      return 'text-amber-600 dark:text-amber-400 border-current bg-transparent'
    case 'location_mismatch':
      return 'text-rose-600 dark:text-rose-400 border-current bg-transparent'
    case 'unverified_gallery':
    default:
      return 'text-slate-500 dark:text-slate-400 border-current bg-transparent'
  }
}

/**
 * Format location verification label with distance
 */
export function formatLocationVerificationLabel(status, distanceMeters) {
  switch (status) {
    case 'verified_on_site':
      return distanceMeters != null ? `Verified On-Site (${distanceMeters}m)` : 'Verified On-Site'
    case 'nearby_approximate':
      return distanceMeters != null ? `Nearby (~${distanceMeters}m)` : 'Nearby'
    case 'location_mismatch':
      return distanceMeters != null ? `Mismatch (${distanceMeters}m)` : 'Location Mismatch'
    case 'unverified_gallery':
      return 'Gallery Upload'
    default:
      return 'Unverified'
  }
}
