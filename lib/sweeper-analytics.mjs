const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function initialMetricsRange(now = new Date()) {
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  return { start: localDate(start), end: localDate(now) }
}

export function toMetricsDateRange({ start, end }) {
  const parse = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose both dates.')
    const date = new Date(`${value}T00:00:00`)
    if (!Number.isFinite(date.getTime()) || localDate(date) !== value) throw new Error('Choose valid dates.')
    return date
  }
  const from = parse(start), to = parse(end)
  if (from > to) throw new Error('The end date must be on or after the start date.')
  to.setHours(23, 59, 59, 999)
  return { start: from, end: to }
}

const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const format = (value, unit = '') => number(value) ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}${unit}` : 'Unavailable'
const sampled = (value, count, empty, unit) => !number(count) ? 'Unavailable' : count === 0 ? empty : format(value, unit)

export function buildSweeperSummary(metrics) {
  const sla = metrics?.slaCompliance ?? {}, outliers = metrics?.outlierMetrics ?? {}, tasks = metrics?.sweeperTasks ?? {}
  const denominator = number(sla.totalReports) && number(sla.breachedReports) && sla.breachedReports <= sla.totalReports
    ? `${format(sla.totalReports - sla.breachedReports)} of ${format(sla.totalReports)} applicable reports stayed within their SLA.`
    : 'Report denominator unavailable.'
  return {
    current: [
      { label: 'Reports beyond SLA', value: format(outliers.currentFlagged), description: 'Currently flagged reports across all areas.' },
      { label: 'Average flagged-report age', value: sampled(outliers.averageAge, outliers.currentFlagged, 'No flagged reports', ' hours'), description: 'Time since the SLA started; a current snapshot.' },
    ],
    period: [
      { label: 'SLA compliance', value: sampled(sla.rate <= 100 ? sla.rate : undefined, sla.totalReports, 'No applicable reports', '%'), description: denominator },
      { label: 'Reports with an SLA breach', value: format(sla.breachedReports), description: 'Reports whose SLA started in the selected period.' },
      { label: 'Completed responses', value: format(outliers.totalResolved), description: 'Successfully completed sweeper tasks created in the period.' },
      { label: 'Average response duration', value: sampled(outliers.averageResolutionTime, outliers.totalResolved, 'No completed responses', ' hours'), description: 'Creation to completion for successful sweeper tasks.' },
    ],
    tasks: [
      { label: 'Tasks created', value: format(tasks.totalCreated), description: 'Sweeper tasks created in the selected period.' },
      { label: 'Tasks now completed', value: format(tasks.totalCompleted), description: 'Current completion state of those tasks.' },
      { label: 'Average estimated route time', value: sampled(tasks.averageRouteTime, tasks.totalCreated, 'No tasks', ' minutes'), description: 'Planning estimates, not measured travel time. Missing estimates count as zero in the source.' },
      { label: 'Average clusters per task', value: sampled(tasks.averageClustersPerTask, tasks.totalCreated, 'No tasks', ' clusters / task'), description: 'Cluster assignments across the tasks created in the period.' },
    ],
  }
}
