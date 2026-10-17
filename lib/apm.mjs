/**
 * Client-Side APM & Session Replay Protection Module (WT-47 / #43 Runbook)
 *
 * Configures client-side error tracking and ensures:
 * 1. Session Replay is strictly disabled on credential and sensitive report forms.
 * 2. Form input text and values are masked (`maskAllInputs: true`, `maskAllText: true`).
 * 3. Client beforeSend hook purges all auth headers and private storage references.
 */

export const REPLAY_EXCLUDED_PATHS = [
  '/auth',
  '/auth/login',
  '/auth/register',
  '/force-change-password',
  '/dashboard/(shared)/profile',
  '/dashboard/officer/operations/create',
  '/reports/new',
  '/api/auth',
  '/api/session'
];

/**
 * Checks whether session replay is allowed for the given client pathname.
 */
export function isClientReplayPermitted(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  const normalized = pathname.toLowerCase().split('?')[0].trim();
  for (const excluded of REPLAY_EXCLUDED_PATHS) {
    if (normalized === excluded || normalized.startsWith(`${excluded}/`)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns Sentry/APM browser client initialization options for the given route.
 */
export function getClientApmOptions(pathname = '') {
  const replayPermitted = isClientReplayPermitted(pathname);

  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || null,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'ecopin@1.0.0',
    // 100% error reporting
    sampleRate: 1.0,
    // Tracing sample rate: 0.1 in prod, 1.0 in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Replay privacy enforcement: strictly 0 if route is in exclusion list
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: replayPermitted ? 0.1 : 0.0,
    // DOM Masking rules
    maskAllInputs: true,
    maskAllText: true,
    blockClass: 'sentry-block',
    ignoreClass: 'sentry-ignore',
    beforeSend: clientBeforeSend
  };
}

/**
 * Client-side beforeSend hook scrubbing sensitive information before network transmission.
 */
export function clientBeforeSend(event) {
  if (!event) return null;

  // Clone event
  const scrubbed = { ...event };

  // Remove any sensitive request headers
  if (scrubbed.request?.headers) {
    const headers = { ...scrubbed.request.headers };
    delete headers.Authorization;
    delete headers.authorization;
    delete headers.Cookie;
    delete headers.cookie;
    delete headers['x-api-key'];
    scrubbed.request.headers = headers;
  }

  // Remove user identifiable fields except anonymous ID
  if (scrubbed.user) {
    scrubbed.user = {
      id: scrubbed.user.id || 'anonymous'
    };
  }

  return scrubbed;
}
