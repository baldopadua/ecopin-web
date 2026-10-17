import crypto from 'node:crypto';

/**
 * Server-Side APM Monitoring & Security Alerting Helper for Next.js (WT-47 / #43 Runbook)
 *
 * Provides:
 * 1. Sentry/Datadog server `beforeSend` hook that purges cookies, Authorization, and citizen PII.
 * 2. Session replay route policy verification.
 * 3. Next.js server error capture and alert dispatching.
 */

export const REPLAY_PROHIBITED_ROUTES = new Set([
  '/auth',
  '/auth/login',
  '/auth/register',
  '/force-change-password',
  '/dashboard/(shared)/profile',
  '/dashboard/officer/operations/create',
  '/reports/new',
  '/api/auth',
  '/api/session'
]);

export const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'session-token',
  'x-csrf-token',
  'proxy-authorization'
]);

export const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
  PHONE: /(?:\+63|0)9\d{9}\b|\+\d{10,15}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  PHILSYS: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g,
  SSS: /\b\d{2}-\d{7}-\d{1}\b/g,
  DB_PASSWORD: /postgres(?:ql)?:\/\/([^:]+):([^@]+)@/g
};

export const SENSITIVE_KEYS = /(?:password|passwd|token|secret|credential|auth|hash|pin|cvv|key|private|new_password|current_password|confirm_password|jwt_secret|service_role)/i;

/**
 * Sanitizes arbitrary text against citizen PII & secret patterns.
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(PII_PATTERNS.DB_PASSWORD, 'postgresql://$1:[REDACTED_PASSWORD]@')
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(PII_PATTERNS.PHILSYS, '[REDACTED_PHILSYS_ID]')
    .replace(PII_PATTERNS.SSS, '[REDACTED_SSS_ID]')
    .replace(PII_PATTERNS.CREDIT_CARD, '[REDACTED_CARD]')
    .replace(PII_PATTERNS.PHONE, '[REDACTED_PHONE]')
    .replace(PII_PATTERNS.EMAIL, '[REDACTED_EMAIL]');
}

/**
 * Recursively scrubs objects or arrays before APM ingestion.
 */
export function deepScrub(val, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH]';
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') return sanitizeText(val);
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) return val.map(item => deepScrub(item, depth + 1));
  if (typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEYS.test(k)) {
        clean[k] = '[REDACTED]';
      } else {
        clean[k] = deepScrub(v, depth + 1);
      }
    }
    return clean;
  }
  return String(val);
}

/**
 * Verifies if Session Replay is allowed on a requested path.
 */
export function isReplayAllowed(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  const path = pathname.toLowerCase().split('?')[0].trim();
  for (const prohibited of REPLAY_PROHIBITED_ROUTES) {
    if (path === prohibited || path.startsWith(`${prohibited}/`)) {
      return false;
    }
  }
  return true;
}

/**
 * Server-side beforeSend hook for APM SDKs (Sentry/Datadog).
 */
export function serverBeforeSend(event) {
  if (!event || typeof event !== 'object') return null;

  const scrubbed = { ...event };

  // Scrub request headers
  if (scrubbed.request?.headers) {
    const headers = {};
    for (const [key, value] of Object.entries(scrubbed.request.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        headers[key] = '[REDACTED_HEADER]';
      } else if (typeof value === 'string') {
        headers[key] = sanitizeText(value);
      } else {
        headers[key] = value;
      }
    }
    scrubbed.request.headers = headers;
  }

  // Scrub cookies
  if (scrubbed.request?.cookies) {
    scrubbed.request.cookies = '[REDACTED_COOKIES]';
  }

  // Scrub request body
  if (scrubbed.request?.data) {
    scrubbed.request.data = deepScrub(scrubbed.request.data);
  }

  // Strip citizen user metadata
  if (scrubbed.user) {
    scrubbed.user = {
      id: scrubbed.user.id || '[ANONYMOUS]',
      role: scrubbed.user.role || 'unknown'
    };
  }

  // Scrub extra context
  if (scrubbed.extra) {
    scrubbed.extra = deepScrub(scrubbed.extra);
  }

  return scrubbed;
}
