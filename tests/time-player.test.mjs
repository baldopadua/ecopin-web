import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAvailableSnapshotDates, getNextSnapshotDate } from '../lib/helpers/forecastTimeline.js'

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
