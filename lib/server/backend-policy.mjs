const ID = '[A-Za-z0-9_-]{1,128}';

const routes = [
  ['GET', /^\/api\/analytics\/barangay$/],
  ['GET', /^\/api\/auth\/(?:me|validate-session)$/],
  ['PUT', /^\/api\/auth\/change-password$/],
  ['DELETE', /^\/api\/auth\/(?:delete-account|account)$/],
  ['POST', /^\/api\/auth\/delete-account$/],
  ['GET', /^\/api\/profile$/],
  ['PUT', /^\/api\/profile$/],
  ['POST', /^\/api\/profile\/avatar$/],
  ['DELETE', /^\/api\/profile\/avatar$/],
  ['GET', /^\/api\/admin\/(?:stats|users|settings|settings\/cms|timeout|system-logs|audit-logs|audit-logs\/archive-status|disaster-recovery\/status|infrastructure\/(?:encryption-status|apm-status|environment-audit))$/],
  ['GET', /^\/api\/response-logs$/],
  ['POST', /^\/api\/admin\/(?:users|settings\/cms\/upload|audit-logs\/archive|disaster-recovery\/verify-replication|disaster-recovery\/drill|infrastructure\/(?:verify-domain-tls|test-apm-alert|verify-preview-isolation))$/],
  ['DELETE', new RegExp(`^/api/admin/users/${ID}$`)],
  ['PATCH', new RegExp(`^/api/admin/users/${ID}/(?:role|password)$`)],
  ['PATCH', /^\/api\/admin\/(?:settings|settings\/cms)$/],
  ['GET', /^\/api\/contact\/settings$/],
  ['GET', /^\/api\/reports$/],
  ['GET', /^\/api\/reports\/quota$/],
  ['GET', /^\/api\/reports\/analytics\/satisfaction$/],
  ['GET', /^\/api\/manual-review(?:\/.*)?$/],
  ['GET', new RegExp(`^/api/reports/(?!cluster$|batch-evidence$|analytics$)${ID}$`)],
  ['GET', new RegExp(`^/api/reports/${ID}/(?:evidence|agency-responses)$`)],
  ['POST', new RegExp(`^/api/reports/${ID}/(?:photo|acknowledge|agency-responses?)$`)],
  ['DELETE', new RegExp(`^/api/reports/${ID}/photo$`)],
  ['PATCH', new RegExp(`^/api/reports/${ID}/(?:status|validation|property-owner-consent|lifecycle|resolve|details)$`)],
  ['GET', new RegExp(`^/api/reports/cluster/${ID}$`)],
  ['PATCH', new RegExp(`^/api/reports/cluster/${ID}/complete$`)],
  ['POST', /^\/api\/reports\/(?:batch-evidence|batch-publishers)$/],
  ['GET', /^\/api\/cleanup-tasks$/],
  ['GET', /^\/api\/cleanup-tasks\/performance(?:\/me)?$/],
  ['POST', /^\/api\/cleanup-tasks(?:\/custom)?$/],
  ['GET', /^\/api\/cleanup-tasks\/available-crew$/],
  ['GET', new RegExp(`^/api/cleanup-tasks/(?!custom$|available-crew$|performance$)${ID}$`)],
  ['POST', new RegExp(`^/api/cleanup-tasks/${ID}/photo$`)],
  ['PATCH', new RegExp(`^/api/cleanup-tasks/${ID}/(?:complete|assign|title)$`)],
  ['GET', /^\/api\/optimization\/(?:queue|runs|routes\/active|crews|settings|templates|options|incomplete-tasks|blocks)$/],
  ['GET', new RegExp(`^/api/optimization/plan/(?!generate$|jobs$)${ID}$`)],
  ['GET', new RegExp(`^/api/optimization/plan/jobs/${ID}$`)],
  ['GET', new RegExp(`^/api/optimization/plan/${ID}/(?:items|disassemble-preview)$`)],
  ['GET', new RegExp(`^/api/optimization/runs/${ID}$`)],
  ['GET', new RegExp(`^/api/optimization/routes/${ID}$`)],
  ['GET', /^\/api\/optimization\/crews\/unassigned-members$/],
  ['POST', /^\/api\/optimization\/(?:queue\/prioritize|plan\/generate|run|crews|templates)$/],
  ['POST', new RegExp(`^/api/optimization/plan/${ID}/(?:commit|disassemble)$`)],
  ['POST', new RegExp(`^/api/optimization/runs/${ID}/(?:approve|discard)$`)],
  ['POST', new RegExp(`^/api/optimization/plan/jobs/${ID}/cancel$`)],
  ['PATCH', new RegExp(`^/api/optimization/crews/${ID}/members$`)],
  ['PUT', new RegExp(`^/api/optimization/(?:crews/(?!unassigned-members$)${ID}|settings)$`)],
  ['DELETE', new RegExp(`^/api/optimization/(?:templates|crews)/${ID}$`)],
  ['GET', /^\/api\/sweeper\/analytics\/(?:metrics|export)$/],
  ['GET', /^\/api\/sweeper\/config$/],
  ['PUT', /^\/api\/sweeper\/config\/(?:sla-threshold|shift-duration|work-time|maturation-threshold)$/],
  ['GET', /^\/api\/clusters$/],
  ['GET', new RegExp(`^/api/clusters/${ID}$`)],
  ['PATCH', new RegExp(`^/api/clusters/${ID}/label$`)],
  ['POST', /^\/api\/clusters\/trigger$/],
  ['POST', /^\/api\/(?:spatial-forecast|spatial)\/generate$/],
  ['GET', /^\/api\/(?:spatial-forecast|spatial)\/(?:patterns|predictions|accuracy|available-dates|forecast\/current|predictions\/current)$/],
  ['GET', new RegExp(`^/api/(?:spatial-forecast|spatial)/current/${ID}$`)],
  ['GET', new RegExp(`^/api/(?:spatial-forecast|spatial)/zones/${ID}/(?:trend|history)$`)],
  ['GET', /^\/api\/media\/storage$/],
];

const publicRoutes = [
  ['POST', /^\/api\/reports\/(?:batch-evidence|batch-publishers)$/],
  ['GET', new RegExp(`^/api/reports/${ID}/evidence$`)],
  ['POST', /^\/api\/auth\/delete-account$/],
  ['DELETE', /^\/api\/auth\/delete-account$/],
  ['GET', /^\/api\/contact\/settings$/],
];

export function isPublicBackendRequest(method, pathname) {
  if (typeof method !== 'string' || typeof pathname !== 'string' || pathname.length > 2048) return false;
  return publicRoutes.some(([allowedMethod, pattern]) => method === allowedMethod && pattern.test(pathname));
}

export function isAllowedBackendRequest(method, pathname) {
  if (typeof method !== 'string' || typeof pathname !== 'string' || pathname.length > 2048) return false;
  if (!/^\/[\x21-\x7E]+$/.test(pathname) || /[%\\?#]/.test(pathname)) return false;
  if (pathname.split('/').some(segment => segment === '.' || segment === '..')) return false;
  return routes.some(([allowedMethod, pattern]) => method === allowedMethod && pattern.test(pathname));
}
