const AREAS = new Set(['auth', 'reports', 'media', 'map', 'dispatch', 'forecast', 'admin', 'settings', 'analytics', 'ui', 'other']);
const CODES = new Set(['42501', 'PGRST116', 'ERR_NETWORK', 'ABORT_ERR', 'ETIMEDOUT', 'ECONNRESET']);
const ERROR_TYPES = new Set(['Error', 'TypeError', 'SyntaxError', 'RangeError', 'AbortError', 'TimeoutError']);

function ownValue(value, key) {
  try {
    return Object.getOwnPropertyDescriptor(value, key)?.value;
  } catch {
    return undefined;
  }
}

// Only copied, allowlisted metadata may cross the diagnostic boundary.
export function reportDiagnostic(level, area, ...values) {
  if (level !== 'error' && level !== 'warn') return;
  const record = {
    event: 'web_operation_failed',
    area: AREAS.has(area) ? area : 'other',
    eventId: globalThis.crypto?.randomUUID?.(),
  };
  for (const value of values) {
    const status = typeof value === 'number' ? value : ownValue(value, 'status') ?? ownValue(value, 'statusCode');
    if (record.status === undefined && Number.isInteger(status) && status >= 400 && status <= 599) record.status = status;
    const code = ownValue(value, 'code');
    if (record.code === undefined && CODES.has(code)) record.code = code;
    const name = ownValue(value, 'name');
    if (record.errorType === undefined && ERROR_TYPES.has(name)) record.errorType = name;
    try {
      if (record.errorType === undefined && value instanceof Error) record.errorType = 'Error';
    } catch {
      // A hostile proxy cannot prevent error reporting.
    }
  }
  if (level === 'error') console.error(record);
  else console.warn(record);
  return record.eventId;
}
