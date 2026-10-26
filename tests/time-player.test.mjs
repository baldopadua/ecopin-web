import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAvailableSnapshotDates, getNextSnapshotDate, extractForecastSteps, projectFeaturesToStep } from '../lib/helpers/forecastTimeline.js'

test('filterAvailableSnapshotDates handles null, empty, and invalid inputs', () => {
  assert.deepEqual(filterAvailableSnapshotDates(null), [])
  assert.deepEqual(filterAvailableSnapshotDates(undefined), [])
  assert.deepEqual(filterAvailableSnapshotDates([]), [])
  assert.deepEqual(filterAvailableSnapshotDates(['', null, 'not-a-date']), [])
})

test('filterAvailableSnapshotDates extracts dates from strings and objects, deduplicates, and sorts chronologically', () => {
  const input = [
    '2026-10-18',
    { prediction_date: '2026-10-15' },
    '2026-10-12',
    { date: '2026-10-15' }, // duplicate
    ' 2026-10-10 ',
    { invalid: 'date' },
  ]
  const expected = [
    '2026-10-10',
    '2026-10-12',
    '2026-10-15',
    '2026-10-18',
  ]
  assert.deepEqual(filterAvailableSnapshotDates(input), expected)
})

test('getNextSnapshotDate progresses linearly and loops correctly', () => {
  const dates = ['2026-10-10', '2026-10-12', '2026-10-15']

  assert.equal(getNextSnapshotDate([], '2026-10-10'), null)
  assert.equal(getNextSnapshotDate(dates, null), '2026-10-10')
  assert.equal(getNextSnapshotDate(dates, '2026-10-10'), '2026-10-12')
  assert.equal(getNextSnapshotDate(dates, '2026-10-12'), '2026-10-15')
  assert.equal(getNextSnapshotDate(dates, '2026-10-15'), '2026-10-10') // loop back
  assert.equal(getNextSnapshotDate(dates, '2026-10-99'), '2026-10-10') // unknown date
})

test('extractForecastSteps starts at Full horizon (date: null) so default horizon totals are not overwritten by partial week 1', () => {
  const features = [
    {
      properties: {
        predicted_count: 25,
        risk_level: 'high',
        forecast_points: [
          { week_start: '2026-10-26', predicted_count: 5.5, lower_bound: 2, upper_bound: 9 },
          { week_start: '2026-10-19', predicted_count: 0.8, lower_bound: 0, upper_bound: 2 },
        ],
      },
    },
  ]

  const steps = extractForecastSteps(features)
  assert.equal(steps.length, 3)
  assert.deepEqual(steps[0], { index: 0, date: null, label: 'Full horizon', shortLabel: 'All' })
  assert.equal(steps[1].date, '2026-10-19')
  assert.match(steps[1].label, /^Week 1 /)
  assert.equal(steps[2].date, '2026-10-26')
  assert.match(steps[2].label, /^Week 2 /)

  // At step 0 (date: null), projectFeaturesToStep is a no-op and preserves full-horizon values
  assert.deepEqual(projectFeaturesToStep(features, steps[0].date), features)

  // At step 2 (full week with 5.5 predicted reports), weekly risk assessment flags high risk
  const projectedWeek2 = projectFeaturesToStep(features, steps[2].date)
  assert.equal(projectedWeek2[0].properties.predicted_count, 5.5)
  assert.equal(projectedWeek2[0].properties.risk_level, 'high')
})
