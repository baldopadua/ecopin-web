import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citizenPriorityLabel } from '../lib/urgency.mjs'
test('citizen priority distinguishes urgency, absence and unrelated status', () => {
  assert.equal(citizenPriorityLabel('urgent'), 'Urgent')
  assert.equal(citizenPriorityLabel('non_urgent'), 'Non-urgent')
  assert.equal(citizenPriorityLabel(' URGENT '), 'Urgent')
  for (const value of [null, undefined, '', 'high', 'approved', 'in_progress', '__proto__', 'constructor']) {
    assert.equal(citizenPriorityLabel(value), 'Not specified')
  }
})
