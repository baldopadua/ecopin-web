const terminal = new Set(['resolved', 'completed', 'closed', 'rejected', 'cancelled']);
const normalize = value => String(value || '').trim().toLowerCase();

// Display policy only. Server timestamps remain authoritative; never restart the SLA clock.
export function responseDeadline(report, now = Date.now()) {
  if (!report || [report.status, report.stage, report.lifecycle_state].some(value => terminal.has(normalize(value))) ||
      normalize(report.validation_status) === 'rejected') return null;
  const deadline = Date.parse(report.deadline_at);
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return null;
  const start = Date.parse(report.sla_started_at);
  const remaining = deadline - now;
  const state = remaining <= 0 ? 'overdue' :
    Number.isFinite(start) && start < deadline && remaining <= (deadline - start) / 5 ? 'at_risk' : 'scheduled';
  const minutes = Math.max(1, Math.ceil(Math.abs(remaining) / 60000));
  const duration = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
  return {
    state, deadlineAt: new Date(deadline).toISOString(),
    label: state === 'overdue' ? 'Response overdue' : state === 'at_risk' ? 'Response deadline approaching' : 'Response deadline',
    timeLabel: `${duration} ${state === 'overdue' ? 'overdue' : 'left'}`,
  };
}
