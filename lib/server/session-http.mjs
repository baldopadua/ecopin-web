import 'server-only';
import { readBoundedJson } from './bounded-json.mjs';
import { readWebSession, rotateWebSession, revokeWebSession, sessionCookie } from './web-session.mjs';
import { reportDiagnostic } from '../diagnostics.mjs';

export function webJson(data, status = 200, cookie) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}

export function webFailure(status = 503) {
  const messages = { 400: 'Invalid request', 401: 'Authentication required', 403: 'Access denied', 404: 'Not found', 413: 'Request too large', 415: 'Unsupported content type', 429: 'Too many requests. Please try again later.', 500: 'Request failed', 502: 'Service response unavailable', 503: 'Service temporarily unavailable', 504: 'Request timed out' };
  const eventId = status >= 500 ? reportDiagnostic('error', 'auth', status) : undefined;
  return webJson({ error: messages[status] || 'Request failed', ...(eventId ? { eventId } : {}) }, status, status === 401 ? sessionCookie(null) : undefined);
}

export function upstreamUrl(path) {
  const base = new URL(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL);
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) || base.username || base.password || base.pathname !== '/' || base.search || base.hash || !path.startsWith('/api/')) throw new Error('Service unavailable');
  return new URL(path, base).href;
}

export async function authorityFetch(path, options = {}, signal) {
  const deadline = AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]);
  return fetch(upstreamUrl(path), { ...options, cache: 'no-store', redirect: 'error', signal: deadline });
}

export async function authorityJson(response, signal, maximum = 2 * 1024 * 1024) {
  const deadline = AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]);
  return readBoundedJson(response.body, maximum, deadline);
}

export async function refreshSession(session, req) {
  if (session.kind !== 'full' || !session.refreshToken) return null;
  const response = await authorityFetch('/api/auth/refresh-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refreshToken }) }, req.signal);
  if (!response.ok) return null;
  const data = await authorityJson(response, req.signal, 32768);
  const rotated = await rotateWebSession(session, { accessToken: data.token, refreshToken: data.session?.refresh_token || session.refreshToken }, req.signal);
  if (rotated) return rotated;
  // A parallel refresh may have won; a revoked record must never be recreated.
  const current = await readWebSession(req);
  return current?.kind === 'full' && current.accessToken !== session.accessToken ? current : null;
}

export async function authenticatedFetch(session, req, path, options = {}) {
  const send = current => authorityFetch(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${current.accessToken}` } }, req.signal);
  let response = await send(session);
  if (response.status === 401 && ['GET', 'HEAD'].includes(options.method || 'GET')) {
    const current = await refreshSession(session, req);
    if (current) { session = current; response = await send(current); }
    else {
      // Revoke only the version that failed, not a concurrently refreshed record.
      const latest = await readWebSession(req);
      if (latest?.sealed === session.sealed) await revokeWebSession(session, req.signal);
    }
  }
  return { response, session };
}

export function sessionMetadata(session, user = null) {
  return { state: session.kind, sessionTag: session.sessionTag, expiresAt: session.expiresAt, user };
}

export function safeUser(user) {
  if (!user || typeof user.id !== 'string' || user.id.length > 128 || !['officer', 'admin'].includes(user.role)) return null;
  return Object.fromEntries(['id', 'role', 'full_name', 'email', 'avatar_url', 'barangay_id', 'lgu_id'].filter(key => ['string', 'number'].includes(typeof user[key]) || user[key] === null).map(key => [key, user[key]]));
}

export function scrubResponse(data) {
  const privateKeys = new Set(['token', 'access_token', 'refresh_token', 'authorization', 'stack', 'password', 'password_hash']);
  return JSON.parse(JSON.stringify(data, (key, value) => privateKeys.has(key.toLowerCase()) ? undefined : value));
}
