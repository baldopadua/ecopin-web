/**
 * Status helper functions for consistent status styling across the application
 */

/**
 * Get color classes for report status
 */
export function getReportStatusColor(status) {
  switch (status) {
    case 'resolved':
      return 'bg-success/20 text-success border-success/30'
    case 'in_progress':
      return 'bg-warning/20 text-warning border-warning/30'
    case 'waiting_for_feedback':
      return 'bg-purple/20 text-purple border-purple/30'
    case 'closed':
      return 'bg-text-muted/20 text-text-muted border-text-muted/30'
    case 'pending_owner_consent':
      return 'bg-info/20 text-info border-info/30'
    default:
      return 'bg-error/20 text-error border-error/30'
  }
}

/**
 * Get color classes for validation status
 */
export function getValidationStatusColor(status) {
  switch (status) {
    case 'validated':
    case 'automatically_valid':
      return 'bg-success/20 text-success border-success/30'
    case 'pending':
    case 'pending_ai_validation':
      return 'bg-warning/20 text-warning border-warning/30'
    case 'manual_review':
    case 'Manual_Review':
      return 'bg-purple/20 text-purple border-purple/30'
    case 'rejected':
      return 'bg-error/20 text-error border-error/30'
    default:
      return 'bg-text-muted/20 text-text-muted border-text-muted/30'
  }
}

/**
 * Get color classes for lifecycle stage
 */
export function getLifecycleStageColor(stage) {
  switch (stage) {
    case 'submitted':
      return 'bg-purple/20 text-purple border-purple/30'
    case 'acknowledged':
      return 'bg-info/20 text-info border-info/30'
    case 'responded':
      return 'bg-warning/20 text-warning border-warning/30'
    case 'resolved':
      return 'bg-success/20 text-success border-success/30'
    case 'closed':
      return 'bg-text-muted/20 text-text-muted border-text-muted/30'
    default:
      return 'bg-text-muted/20 text-text-muted border-text-muted/30'
  }
}

/**
 * Get color classes for cleanup task status
 */
export function getTaskStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success border-success/30'
    case 'in_progress':
      return 'bg-warning/10 text-warning border-warning/30'
    case 'pending':
      return 'bg-info/10 text-info border-info/30'
    default:
      return 'bg-info/10 text-info border-info/30'
  }
}

/**
 * Get color classes for cluster severity
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case 'high':
      return 'bg-error/10 text-error border-error/30'
    case 'medium':
      return 'bg-warning/10 text-warning border-warning/30'
    case 'low':
      return 'bg-info/10 text-info border-info/30'
    default:
      return 'bg-surface text-text-muted border-border'
  }
}

/**
 * Get color classes for cluster status
 */
export function getClusterStatusColor(status) {
  switch (status) {
    case 'resolved':
      return 'bg-success/10 text-success border-success/30'
    case 'in_progress':
      return 'bg-warning/10 text-warning border-warning/30'
    case 'waiting_for_feedback':
      return 'bg-info/10 text-info border-info/30'
    case 'closed':
      return 'bg-surface text-text-muted border-border'
    case 'pending_owner_consent':
      return 'bg-warning/10 text-warning border-warning/30'
    default:
      return 'bg-error/10 text-error border-error/30'
  }
}

/**
 * Get color classes for audit log action types
 */
export function getAuditActionColor(actionType) {
  switch (actionType) {
    case 'login':
      return 'bg-success/10 text-success'
    case 'logout':
      return 'bg-surface text-text-muted'
    case 'password_change':
      return 'bg-warning/10 text-warning'
    case 'role_change':
      return 'bg-purple/10 text-purple'
    case 'user_created':
      return 'bg-info/10 text-info'
    case 'user_deleted':
      return 'bg-error/10 text-error'
    default:
      return 'bg-surface text-text-muted'
  }
}

/**
 * Get color classes for response log action types
 */
export function getResponseActionColor(actionType) {
  switch (actionType) {
    case 'status_update':
      return 'bg-info/10 text-info'
    case 'lifecycle_stage_update':
      return 'bg-purple/10 text-purple'
    case 'acknowledge_complaint':
    case 'lgu_resolve':
      return 'bg-success/10 text-success'
    case 'manual_note':
      return 'bg-warning/10 text-warning'
    case 'citizen_close':
      return 'bg-surface text-text-muted'
    case 'login':
      return 'bg-success/10 text-success'
    case 'password_change':
      return 'bg-warning/10 text-warning'
    default:
      return 'bg-surface text-text-muted'
  }
}

/**
 * Get color classes for user roles
 */
export function getRoleBadgeColor(role) {
  switch (role) {
    case 'admin':
      return 'bg-purple/10 text-purple'
    case 'officer':
      return 'bg-info/10 text-info'
    case 'field_crew':
      return 'bg-warning/10 text-warning'
    case 'citizen':
    default:
      return 'bg-surface text-text-muted'
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
      return 'bg-success/10 text-success border-success/30'
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/30'
    case 'denied':
      return 'bg-error/10 text-error border-error/30'
    default:
      return 'bg-surface text-text-muted border-border'
  }
}