import 'server-only';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { readBoundedJson } from './bounded-json.mjs';

export const SESSION_COOKIE = '__Host-ecopin_session';
const lifetime = { full: 30 * 24 * 60 * 60, temporary: 300 };
const keyFor = id => `ecopin:web-session:v1:${createHash('sha256').update(id).digest('hex')}`;
const unavailable = () => new Error('Session unavailable');

function configuration() {
  try {
    const url = new URL(process.env.SESSION_REDIS_REST_URL);
    const token = process.env.SESSION_REDIS_REST_TOKEN;
    const key = Buffer.from(process.env.SESSION_ENCRYPTION_KEY || '', 'base64url');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !token || key.length !== 32) throw unavailable();
    return { url, token, key };
  } catch { throw unavailable(); }
}

export async function sessionCommand(command, signal) {
  const { url, token } = configuration();
  try {
    const deadline = AbortSignal.any([AbortSignal.timeout(2000), ...(signal ? [signal] : [])]);
    const response = await fetch(url.href, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', redirect: 'error', signal: deadline,
    });
    if (!response.ok) throw unavailable();
    const body = await readBoundedJson(response.body, 65536, deadline);
    if (body.error || !Object.hasOwn(body, 'result')) throw unavailable();
    return body.result;
  } catch { throw unavailable(); }
}

function seal(record, id) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', configuration().key, iv);
  cipher.setAAD(Buffer.from(`ecopin:web-session:v1:${id}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(record)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function unseal(value, id) {
  const bytes = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', configuration().key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(`ecopin:web-session:v1:${id}`));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
}

function validToken(token) {
  return typeof token === 'string' && token.length > 0 && token.length <= 8192 && /^[A-Za-z0-9._~+/-]+=*$/.test(token);
}

export function frontendOrigin() {
  const url = new URL(process.env.FRONTEND_URL);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw unavailable();
  return url.origin;
}

export function hasTrustedOrigin(req) {
  try {
    const expected = frontendOrigin();
    if (new URL(req.url).origin !== expected) return false;
    const origin = req.headers.get('origin');
    if (origin !== expected) return false;
    if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
    const referer = req.headers.get('referer');
    if (referer) {
      const refererUrl = new URL(referer);
      if (refererUrl.origin !== expected) return false;
    }
    return true;
  } catch { return false; }
}


export function sessionCookie(id, expiresAt = 0) {
  const age = id ? Math.max(0, Math.min(lifetime.full, Math.floor((expiresAt - Date.now()) / 1000))) : 0;
  return `${SESSION_COOKIE}=${id || ''}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}

export async function issueWebSession({ accessToken, refreshToken = null, kind, maxAge = lifetime[kind] }, signal) {
  if (!Object.hasOwn(lifetime, kind) || !validToken(accessToken) || (refreshToken !== null && !validToken(refreshToken))) throw unavailable();
  if (!Number.isInteger(maxAge) || maxAge <= 0 || maxAge > lifetime[kind]) throw unavailable();
  const record = { kind, accessToken, refreshToken, sessionTag: randomBytes(16).toString('base64url'), expiresAt: Date.now() + maxAge * 1000 };
  const id = randomBytes(32).toString('base64url');
  const sealed = seal(record, id);
  if (await sessionCommand(['SET', keyFor(id), sealed, 'EX', maxAge, 'NX'], signal) !== 'OK') throw unavailable();
  return { ...record, id, sealed };
}

export async function readWebSession(req) {
  const cookies = (req.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${SESSION_COOKIE}=`));
  if (cookies.length !== 1) return null;
  const id = cookies[0].slice(SESSION_COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(id)) return null;
  const sealed = await sessionCommand(['GET', keyFor(id)], req.signal);
  if (typeof sealed !== 'string' || sealed.length > 60000) return null;
  try {
    const record = unseal(sealed, id);
    if (!Object.hasOwn(lifetime, record.kind) || !validToken(record.accessToken) || (record.refreshToken !== null && !validToken(record.refreshToken)) || !Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now() || record.expiresAt > Date.now() + lifetime[record.kind] * 1000) return null;
    return { ...record, id, sealed };
  } catch { return null; }
}

const replaceScript = `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1`;

export async function rotateWebSession(session, { accessToken, refreshToken = session.refreshToken }, signal) {
  if (!validToken(accessToken) || (refreshToken !== null && !validToken(refreshToken))) throw unavailable();
  const ttl = Math.floor((session.expiresAt - Date.now()) / 1000);
  if (ttl <= 0) return null;
  const record = { kind: session.kind, expiresAt: session.expiresAt, sessionTag: session.sessionTag, accessToken, refreshToken };
  const sealed = seal(record, session.id);
  const result = await sessionCommand(['EVAL', replaceScript, 1, keyFor(session.id), session.sealed, sealed, ttl], signal);
  return result === 1 ? { ...record, id: session.id, sealed } : null;
}

export async function revokeWebSession(session, signal) {
  await sessionCommand(['DEL', keyFor(session.id)], signal);
}
