import { setSessionMetadata, clearSessionMetadata, loadSessionMetadata, publishSessionChange } from '../auth-token.mjs';

async function sessionAction(action, body) {
  const response = await fetch(`/api/session/${action}`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Session request failed');
  return data;
}
export async function login(email, password) {
  const data = await sessionAction('login', { email, password });
  setSessionMetadata(data);
  publishSessionChange();
  return data;
}
export async function logout() {
  clearSessionMetadata();
  try { return await sessionAction('logout'); }
  finally { clearSessionMetadata(); publishSessionChange(); }
}
export async function validateSession() {
  const session = await loadSessionMetadata();
  return { valid: session?.state === 'full' };
}
export async function refreshAuthToken() {
  try {
    const data = await sessionAction('refresh');
    setSessionMetadata(data);
    return data.sessionTag;
  } catch { clearSessionMetadata(); return null; }
}
export async function forceChangePassword(newPassword) {
  const data = await sessionAction('password', { new_password: newPassword });
  clearSessionMetadata();
  publishSessionChange();
  return data;
}
