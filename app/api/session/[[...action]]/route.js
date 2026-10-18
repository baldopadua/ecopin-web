import { createHash } from 'node:crypto';
import { readBoundedJson } from '../../../../lib/server/bounded-json.mjs';
import { issueWebSession, readWebSession, revokeWebSession, hasTrustedOrigin, sessionCookie } from '../../../../lib/server/web-session.mjs';
import { authorityFetch, authorityJson, authenticatedFetch, sessionMetadata, safeUser, webJson, webFailure } from '../../../../lib/server/session-http.mjs';
import { checkPreviewQuota } from '../../../../lib/server/preview-quota.mjs';

export const runtime = 'nodejs';

async function input(req, fields) {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return null;
  const deadline = AbortSignal.any([AbortSignal.timeout(2000), req.signal]);
  const data = await readBoundedJson(req.body, 8192, deadline);
  return data && !Array.isArray(data) && typeof data === 'object' && Object.keys(data).every(key => fields.includes(key)) ? data : null;
}

async function getSession(req, action) {
  const session = await readWebSession(req);
  if (!session) return webFailure(401);
  if (action === 'password-policy') {
    const response = await authorityFetch('/api/admin/settings', {}, req.signal);
    if (!response.ok) return webFailure(503);
    const settings = await authorityJson(response, req.signal, 32768);
    const policy = {};
    if (Number.isInteger(settings.password_min_length) && settings.password_min_length >= 8 && settings.password_min_length <= 128) policy.password_min_length = settings.password_min_length;
    for (const key of ['password_require_uppercase', 'password_require_lowercase', 'password_require_numbers', 'password_require_special_chars']) if (typeof settings[key] === 'boolean') policy[key] = settings[key];
    return webJson(policy);
  }
  if (action) return webFailure(404);
  if (session.kind === 'temporary') return webJson(sessionMetadata(session));
  const { response, session: current } = await authenticatedFetch(session, req, '/api/auth/me');
  if (!response.ok) return webFailure(response.status === 401 || response.status === 403 ? 401 : 503);
  const user = safeUser((await authorityJson(response, req.signal, 32768)).user);
  return user ? webJson(sessionMetadata(current, user)) : webFailure(403);
}

export async function GET(req, context) {
  try { return await getSession(req, ((await context.params).action || []).join('/')); }
  catch { return webFailure(503); }
}

export async function POST(req, context) {
  if (!hasTrustedOrigin(req)) return webFailure(403);
  try {
    const action = ((await context.params).action || []).join('/');
    if (action === 'login') {
      const data = await input(req, ['email', 'password']);
      if (!data || typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.password !== 'string' || !data.password || data.password.length > 1024) {
        return webJson({ error: 'Please enter a valid email address and password.' }, 400);
      }
      const quota = await checkPreviewQuota(createHash('sha256').update(data.email.trim().toLowerCase()).digest('hex'), req.signal, 'ecopin:session-login:v1');
      if (quota.status !== 200) {
        return webJson({ error: 'Too many login attempts. Please wait a few moments and try again.' }, 429);
      }
      const response = await authorityFetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email.trim(), password: data.password }) }, req.signal);
      if (!response.ok) {
        let errMessage = null;
        try {
          const errData = await authorityJson(response, req.signal, 4096);
          errMessage = errData?.message || errData?.error;
        } catch { /* ignore parse error */ }

        if (response.status === 401 || response.status === 403) {
          return webJson({ error: errMessage || 'Invalid email or password. Please try again.' }, response.status);
        }
        return webFailure(response.status === 429 ? 429 : 503);
      }
      const result = await authorityJson(response, req.signal, 32768);
      const kind = result.requirePasswordChange === true ? 'temporary' : 'full';
      let user = null;
      let maxAge = 300;
      if (kind === 'full') {
        const verification = await authorityFetch('/api/auth/me', { headers: { Authorization: `Bearer ${result.token}` } }, req.signal);
        if (!verification.ok) return webJson({ error: 'Unable to verify account permissions. Please try again.' }, 401);
        user = safeUser((await authorityJson(verification, req.signal, 32768)).user);
        if (!user) return webJson({ error: 'This sign-in is for authorized personnel only.' }, 403);
        const policyResponse = await authorityFetch('/api/admin/timeout', { headers: { Authorization: `Bearer ${result.token}` } }, req.signal);
        if (!policyResponse.ok) return webFailure(503);
        const policy = await authorityJson(policyResponse, req.signal, 32768);
        if (!Number.isFinite(policy.session_timeout_minutes) || policy.session_timeout_minutes <= 0) return webFailure(503);
        maxAge = Math.max(1, Math.floor(Math.min(60, policy.session_timeout_minutes) * 60));
      }
      const previous = await readWebSession(req);
      if (previous) await revokeWebSession(previous, req.signal);
      const session = await issueWebSession({ accessToken: result.token, refreshToken: kind === 'full' ? result.session?.refresh_token || null : null, kind, maxAge }, req.signal);
      return webJson(sessionMetadata(session, user), 200, sessionCookie(session.id, session.expiresAt));
    }
    const session = await readWebSession(req);
    if (action === 'logout') {
      if (session) {
        await revokeWebSession(session, req.signal);
        try { await authorityFetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` } }, req.signal); } catch { /* Local revocation already succeeded. */ }
      }
      return webJson({ success: true }, 200, sessionCookie(null));
    }
    if (!session) return webFailure(401);
    if (action === 'password') {
      if (session.kind !== 'temporary') return webFailure(403);
      const data = await input(req, ['new_password']);
      if (!data || typeof data.new_password !== 'string' || !data.new_password || data.new_password.length > 1024) return webFailure(400);
      const response = await authorityFetch('/api/auth/force-change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify(data) }, req.signal);
      if (!response.ok) return webFailure(response.status >= 500 ? 503 : 400);
      await revokeWebSession(session, req.signal);
      return webJson({ success: true }, 200, sessionCookie(null));
    }
    if (action === 'refresh') {
      if (session.kind !== 'full') return webFailure(403);
      return getSession(req, '');
    }
    return webFailure(404);
  } catch (error) {
    if (error instanceof RangeError) return webFailure(413);
    if (error instanceof SyntaxError) return webFailure(400);
    return webFailure(503);
  }
}
