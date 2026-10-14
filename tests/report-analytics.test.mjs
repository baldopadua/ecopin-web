import test from 'node:test'
import assert from 'node:assert/strict'
import { creationWeekKey } from '../lib/report-analytics.mjs'

test('creation weeks use the week year at January and December boundaries', () => {
  assert.equal(creationWeekKey(new Date(2021, 0, 1)), '2020-W53')
  assert.equal(creationWeekKey(new Date(2021, 0, 4)), '2021-W01')
  assert.equal(creationWeekKey(new Date(2024, 11, 30)), '2025-W01')
  assert.equal(creationWeekKey(new Date(2026, 9, 14)), '2026-W42')
  assert.equal(creationWeekKey(new Date('invalid')), null)
})
