export const REPORT_LIFECYCLE_BUCKETS = [
  ['submitted', 'Submitted'], ['verified', 'Verified'], ['assigned', 'Assigned'],
  ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['rejected', 'Rejected'], ['uncategorized', 'Uncategorized'],
]
const counts = value => value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(n => Number.isSafeInteger(n) && n >= 0)
const sum = value => Object.values(value).reduce((a, b) => a + b, 0)

export function reconciledReportSummary(value) {
  if (!value || !Number.isSafeInteger(value.total) || value.total < 0 || !counts(value.byLifecycle) ||
    Object.keys(value.byLifecycle).length !== REPORT_LIFECYCLE_BUCKETS.length || !REPORT_LIFECYCLE_BUCKETS.every(([key]) => Object.hasOwn(value.byLifecycle, key)) ||
    !counts(value.byStatus) || !counts(value.uncategorizedByStatus) ||
    sum(value.byLifecycle) !== value.total || sum(value.byStatus) !== value.total || sum(value.uncategorizedByStatus) !== value.byLifecycle.uncategorized ||
    !Number.isFinite(Date.parse(value.snapshotAt)) || value.classificationVersion !== 'pdt25-v1') return null
  return value
}
