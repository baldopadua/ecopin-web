import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSweeperSummary, toMetricsDateRange, initialMetricsRange } from '../lib/sweeper-analytics.mjs'

test('date bounds include the whole local day and reject invalid or reversed dates', () => {
  const range = toMetricsDateRange({ start: '2026-10-01', end: '2026-10-14' })
  assert.equal(range.start.getHours(), 0)
  assert.equal(range.end.getHours(), 23)
  assert.equal(range.end.getMilliseconds(), 999)
  assert.throws(() => toMetricsDateRange({ start: '2026-02-30', end: '2026-10-14' }))
  assert.throws(() => toMetricsDateRange({ start: '2026-10-15', end: '2026-10-14' }))
  assert.throws(() => toMetricsDateRange({ start: '', end: '2026-10-14' }))
  assert.deepEqual(initialMetricsRange(new Date(2026, 9, 14, 18)), { start: '2026-09-14', end: '2026-10-14' })
})

test('zero observations are distinguished from missing values and successful compliance', () => {
  const summary = buildSweeperSummary({
    slaCompliance: { rate: 100, totalReports: 0, breachedReports: 0 },
    outlierMetrics: { currentFlagged: 0, averageAge: 0, totalResolved: 0, averageResolutionTime: 0 },
    sweeperTasks: { totalCreated: 0, totalCompleted: 0, averageRouteTime: 0, averageClustersPerTask: 0 },
  })
  assert.equal(summary.current[0].value, '0')
  assert.equal(summary.current[1].value, 'No flagged reports')
  assert.equal(summary.period[0].value, 'No applicable reports')
  assert.equal(summary.period[3].value, 'No completed responses')
  assert.equal(summary.tasks[2].value, 'No tasks')
  for (const card of buildSweeperSummary({}).period) assert.equal(card.value, 'Unavailable')
})

test('real metrics keep scope, denominators, units, and estimated route provenance', () => {
  const summary = buildSweeperSummary({
    slaCompliance: { rate: 75, totalReports: 8, breachedReports: 2 },
    outlierMetrics: { currentFlagged: 3, averageAge: 40.5, totalResolved: 2, averageResolutionTime: 6 },
    sweeperTasks: { totalCreated: 4, totalCompleted: 3, averageRouteTime: 21, averageClustersPerTask: 1.5 },
  })
  assert.equal(summary.period[0].value, '75%')
  assert.match(summary.period[0].description, /6 of 8/)
  assert.equal(summary.current[1].value, '40.5 hours')
  assert.equal(summary.tasks[2].label, 'Average estimated route time')
  assert.equal(summary.tasks[2].value, '21 minutes')
  assert.equal(summary.tasks[3].value, '1.5 clusters / task')
  const invalid = buildSweeperSummary({ slaCompliance: { totalReports: 2, rate: NaN }, sweeperTasks: { totalCreated: 4, averageRouteTime: -1 } })
  assert.equal(invalid.period[0].value, 'Unavailable')
  assert.equal(invalid.tasks[2].value, 'Unavailable')
})
