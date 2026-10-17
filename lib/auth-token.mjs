let metadata = null;
let revision = 0;
let pending = null;
const eventName = 'ecopin-session-changed';
const channel = typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('ecopin-web-session') : null;

function purgeLegacyCredentials() {
  if (typeof window === 'undefined') return;
  for (const name of ['localStorage', 'sessionStorage']) {
    for (const key of ['authToken', 'tempAuthToken', 'refreshToken']) {
      try { window[name].removeItem(key); } catch { /* Browser storage can be disabled. */ }
    }
  }
}
purgeLegacyCredentials();

export function getSessionMetadata() { return typeof window === 'undefined' ? null : metadata; }
export function readSessionKey() { return getSessionMetadata()?.state === 'full' ? metadata.sessionTag : null; }
export function setSessionMetadata(value) {
  if (typeof window === 'undefined') return;
  revision++;
  purgeLegacyCredentials();
  metadata = value && ['full', 'temporary'].includes(value.state) && typeof value.sessionTag === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value.sessionTag) && Number.isFinite(value.expiresAt)
    ? { state: value.state, sessionTag: value.sessionTag, expiresAt: value.expiresAt, user: value.user ? Object.fromEntries(['id', 'role', 'full_name', 'email', 'avatar_url', 'barangay_id', 'lgu_id'].filter(key => ['string', 'number'].includes(typeof value.user[key]) || value.user[key] === null).map(key => [key, value.user[key]])) : null }
    : null;
  window.dispatchEvent(new Event(eventName));
}
export function clearSessionMetadata() { setSessionMetadata(null); }
export function publishSessionChange() { channel?.postMessage('changed'); }
export async function loadSessionMetadata() {
  if (typeof window === 'undefined') return null;
  if (pending) return pending;
  const started = revision;
  pending = (async () => {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      const data = response.ok ? await response.json() : null;
      if (revision === started) setSessionMetadata(data);
      return metadata;
    } catch {
      if (revision === started) clearSessionMetadata();
      return metadata;
    } finally { pending = null; }
  })();
  return pending;
}
if (channel) channel.onmessage = () => { clearSessionMetadata(); void loadSessionMetadata(); };
export function subscribeSession(listener) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
export function triggerSessionExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('session-expired'));
}
