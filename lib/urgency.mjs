export const urgencyReasonLabels={
  community_event:'Community Event/Liga',school_hospital_zone:'School/Hospital Zone',
  severe_obstruction:'Severe Obstruction',public_health_hazard:'Public Health Hazard',
}
export function canApproveUrgency(report) {
  return report.review_allowed===true && Boolean(report.sla_started_at) && report.validation_status==='approved' &&
    (!report.on_private_property || report.property_owner_consent_status==='obtained') &&
    !['suspected_hazard','hazmat_required','hazard_review'].includes(report.hazard_class)
}
export function urgencyDispatchSettings(report) {
  if (!report.dispatchable || report.urgency_status!=='approved') throw new Error('Verify urgency and dispatch readiness first.')
  return report.cluster_id ? {mode:'standard',cluster_ids:[report.cluster_id]}
    : {mode:'sweeper',report_ids:[report.id]}
}
