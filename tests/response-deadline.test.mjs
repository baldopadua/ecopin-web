import test from 'node:test';
import assert from 'node:assert/strict';
import { responseDeadline } from '../lib/response-deadline.mjs';

const report = { status: 'unresolved', validation_status: 'approved',
  sla_started_at: '2026-10-27T00:00:00Z', deadline_at: '2026-10-28T00:00:00Z' };

test('warning begins at the final 20 percent of the actual SLA window', () => {
  assert.equal(responseDeadline(report, Date.parse('2026-10-27T19:11:59Z')).state, 'scheduled');
  const result = responseDeadline(report, Date.parse('2026-10-27T19:12:00Z'));
  assert.equal(result.state, 'at_risk');
  assert.equal(result.timeLabel, '4h 48m left');
});
test('deadline equality is overdue; sub-minute time never rounds to zero', () => {
  assert.equal(responseDeadline(report, Date.parse('2026-10-27T23:59:59Z')).timeLabel, '1m left');
  assert.equal(responseDeadline(report, Date.parse(report.deadline_at)).state, 'overdue');
  assert.equal(responseDeadline(report, Date.parse('2026-10-28T01:30:00Z')).timeLabel, '1h 30m overdue');
});
test('assignment and cluster membership do not hide deadline risk', () => {
  for (const lifecycle_state of ['clustered', 'dispatched']) {
    assert.equal(responseDeadline({ ...report, lifecycle_state, status: 'in_progress' }, Date.parse(report.deadline_at)).state, 'overdue');
  }
});
test('terminal and rejected reports do not keep counting down', () => {
  for (const status of ['resolved', 'completed', 'closed', 'rejected', 'cancelled']) {
    assert.equal(responseDeadline({ ...report, status }, Date.parse(report.deadline_at)), null);
  }
  assert.equal(responseDeadline({ ...report, validation_status: 'rejected' }), null);
});
test('missing clocks are not reconstructed from creation time or stale breach flags', () => {
  assert.equal(responseDeadline({ ...report, deadline_at: null, breached_at: report.deadline_at }), null);
  assert.equal(responseDeadline({ ...report, deadline_at: 'invalid' }), null);
  assert.equal(responseDeadline({ ...report, sla_started_at: null }, Date.parse('2026-10-27T23:00:00Z')).state, 'scheduled');
  assert.equal(responseDeadline({ ...report, sla_started_at: report.deadline_at }, Date.parse('2026-10-27T23:00:00Z')).state, 'scheduled');
});
test('time zones describe the same deadline instant', () => {
  assert.deepEqual(responseDeadline({ ...report, deadline_at: '2026-10-28T08:00:00+08:00' }, Date.parse('2026-10-27T23:00:00Z')),
    responseDeadline(report, Date.parse('2026-10-27T23:00:00Z')));
});
