export function getPreviewReportIds(task) {
  const included = (task.included_reports || []).map(report => report.report_id);
  const ids = [...new Set(task.primary_target_is_cluster ? included : [task.primary_target_id, ...included])];
  if (!ids.length || ids.some(id => typeof id !== 'string' || !id.trim())) {
    throw new Error('This task preview has no valid reports. Generate a new preview before dispatching.');
  }
  return ids;
}
