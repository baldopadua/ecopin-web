import test from 'node:test'
import assert from 'node:assert/strict'
import { formatStatusLabel, formatActionLabel, getReportStatusColor, getValidationStatusColor } from '../lib/helpers/statusHelpers.js'

test('display labels are readable without changing stored states', () => {
  const status = 'pending_owner_consent'
  assert.equal(formatStatusLabel(status), 'Pending owner consent')
  assert.equal(status, 'pending_owner_consent')
  assert.equal(formatStatusLabel('Manual_Review'), 'Manual review')
  assert.equal(formatActionLabel('lifecycle_stage_update'), 'Lifecycle stage update')
  assert.equal(formatStatusLabel(null), 'Not available')
})

test('review and lifecycle retain semantic status treatments', () => {
  assert.match(getReportStatusColor('resolved'), /text-success/)
  assert.match(getValidationStatusColor('approved'), /text-success/)
  assert.match(getValidationStatusColor('manual_review'), /text-purple/)
  assert.doesNotMatch(getReportStatusColor('resolved'), /ccff00/i)
})
