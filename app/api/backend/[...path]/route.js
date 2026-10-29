import { isAllowedBackendRequest, isPublicBackendRequest } from '../../../../lib/server/backend-policy.mjs';
import { readWebSession, hasTrustedOrigin } from '../../../../lib/server/web-session.mjs';
import { authenticatedFetch, authorityFetch, authorityJson, scrubResponse, webFailure, webJson } from '../../../../lib/server/session-http.mjs';
import { readBoundedBytes } from '../../../../lib/server/bounded-json.mjs';

export const runtime = 'nodejs';

async function handle(req) {
  const url = new URL(req.url);
  const prefix = '/api/backend';
  const pathname = url.pathname.slice(prefix.length);
  if (!url.pathname.startsWith(`${prefix}/`) || !isAllowedBackendRequest(req.method, pathname) || url.search.length > 4096) return webFailure(404);
  if (!['GET', 'HEAD'].includes(req.method) && !hasTrustedOrigin(req)) return webFailure(403);
  const isPublic = isPublicBackendRequest(req.method, pathname);
  try {
    const session = await readWebSession(req);
    if (!session && !isPublic) return webFailure(401);
    if (session && session.kind !== 'full') return webFailure(403);
    const headers = { Accept: 'application/json' };
    let body;
    if (!['GET', 'HEAD'].includes(req.method) && req.body) {
      const contentType = req.headers.get('content-type') || '';
      const multipart = contentType.toLowerCase().startsWith('multipart/form-data;');
      if (!multipart && contentType.split(';')[0].trim().toLowerCase() !== 'application/json') return webFailure(415);
      const maximum = multipart ? 10 * 1024 * 1024 : 64 * 1024;
      if (Number(req.headers.get('content-length')) > maximum) return webFailure(413);
      body = await readBoundedBytes(req.body, maximum, AbortSignal.any([AbortSignal.timeout(10000), req.signal]));
      headers['Content-Type'] = contentType;
    }
    const response = session
      ? (await authenticatedFetch(session, req, pathname + url.search, { method: req.method, headers, ...(body ? { body } : {}) })).response
      : await authorityFetch(pathname + url.search, { method: req.method, headers, ...(body ? { body } : {}) }, req.signal);
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return webFailure([400, 401, 403, 404, 409, 413, 415, 429, 503].includes(response.status) ? response.status : 502);
    }
    if (response.status === 204) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (type === 'application/json' || type?.endsWith('+json')) return webJson(scrubResponse(await authorityJson(response, req.signal)), response.status);
    const image = (pathname === '/api/media/storage' || /^\/api\/reports\/[A-Za-z0-9_-]+\/cleanup-proof\/(?:original\/(?:before|after)|public\/[A-Za-z0-9_-]+\/(?:before|after))$/.test(pathname)) && ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type);
    const exported = pathname === '/api/sweeper/analytics/export' && ['text/csv', 'application/pdf', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(type);
    if (!image && !exported) return webFailure(502);
    const bytes = await readBoundedBytes(response.body, 10 * 1024 * 1024, AbortSignal.any([AbortSignal.timeout(10000), req.signal]));
    return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(exported ? { 'Content-Disposition': 'attachment' } : {}) } });
  } catch (error) {
    if (error instanceof RangeError) return webFailure(413);
    return webFailure(503);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
