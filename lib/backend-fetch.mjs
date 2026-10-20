import { clearSessionMetadata, triggerSessionExpired } from './auth-token.mjs';

// Only the configured backend is remapped; public Supabase/third-party auth stays separate.
export async function backendFetch(input, init = {}) {
  const value = input instanceof Request ? input.url : String(input);
  let target = value;
  let protectedRequest = value.startsWith('/api/backend/') || value.startsWith('/api/tasks/auto-generate/preview');
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_BACKEND_API_URL);
    const url = new URL(value);
    if (url.origin === configured.origin && url.pathname.startsWith('/api/')) {
      target = `/api/backend${url.pathname}${url.search}`;
      protectedRequest = true;
    }
  } catch { /* Relative routes and absent backend configuration need no URL rewrite. */ }
  if (!protectedRequest) return fetch(input, init);
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.delete('authorization');
  const response = await fetch(target, { ...init, headers, credentials: 'same-origin', cache: 'no-store' });
  if (response.status === 401 && typeof window !== 'undefined') {
    clearSessionMetadata();
    triggerSessionExpired();
  }
  const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const pathname = new URL(target, 'http://localhost').pathname;
  const readOnlyPost = method === 'POST' && ['/api/backend/api/reports/batch-evidence', '/api/backend/api/reports/batch-publishers', '/api/tasks/auto-generate/preview'].includes(pathname);
  if (response.ok && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !readOnlyPost && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ecopin-dashboard-data-changed'));
  }
  return response;
}
