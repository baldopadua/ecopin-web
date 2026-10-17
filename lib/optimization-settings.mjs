/**
 * Normalizes shift capacity target and capacity utilization between percentage and ratio formats.
 * Ensures preset templates with either key properly populate both fields.
 */
export function normalizeCapacitySettings(settings = {}) {
  const raw = settings.capacity_utilization ?? settings.shift_capacity_target;
  if (raw == null) return { ...settings, capacity_utilization: 1.0, shift_capacity_target: 100 };
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return { ...settings, capacity_utilization: 1.0, shift_capacity_target: 100 };
  const ratio = num > 1 ? Math.min(1.0, Math.max(0.1, num / 100)) : Math.min(1.0, Math.max(0.1, num));
  return {
    ...settings,
    capacity_utilization: ratio,
    shift_capacity_target: Math.round(ratio * 100)
  };
}
