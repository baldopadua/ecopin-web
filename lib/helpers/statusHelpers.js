/**
 * Status helper functions for consistent status styling across the application
 */

/**
 * Get color classes for report status
 */
export function getReportStatusColor(status) {
  switch (status) {
    case 'resolved':
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
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
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
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
    case 'acknowledged':
      return 'text-info border-current bg-transparent'
    case 'responded':
      return 'text-warning border-current bg-transparent'
    case 'resolved':
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
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
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
    case 'in_progress':
      return 'text-warning border-current bg-transparent'
    case 'pending':
      return 'text-info border-current bg-transparent'
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
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
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
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
    case 'logout':
      return 'text-gray-500 border-current bg-transparent'
    case 'password_change':
      return 'text-warning border-current bg-transparent'
    case 'role_change':
      return 'text-purple border-current bg-transparent'
    case 'user_created':
      return 'text-info border-current bg-transparent'
    case 'user_deleted':
      return 'text-error border-current bg-transparent'
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
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
    case 'manual_note':
      return 'text-warning border-current bg-transparent'
    case 'citizen_close':
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
    case 'login':
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
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
  return status ? status.replace(/_/g, ' ').toUpperCase() : 'N/A'
}

/**
 * Format action type label for display
 */
export function formatActionLabel(actionType) {
  return actionType ? actionType.replace(/_/g, ' ').toUpperCase() : 'N/A'
}

/**
 * Get color classes for property owner consent status
 */
export function getConsentStatusColor(status) {
  switch (status) {
    case 'obtained':
      return 'text-success dark:text-[#ccff00] border-current bg-transparent'
    case 'pending':
      return 'text-warning border-current bg-transparent'
    case 'denied':
      return 'text-error border-current bg-transparent'
    default:
      return 'text-gray-600 dark:text-gray-400 border-current bg-transparent'
  }
}