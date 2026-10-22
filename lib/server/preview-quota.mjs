import 'server-only';
import { createHash } from 'node:crypto';
import { readBoundedJson } from './bounded-json.mjs';

// One atomic admission decision; counters and expiries cannot race across instances.
const admissionScript = `
local principal = tonumber(redis.call('GET', KEYS[1]) or '0')
local total = tonumber(redis.call('GET', KEYS[2]) or '0')
local wait = 0
if principal >= 5 then wait = math.max(wait, redis.call('PTTL', KEYS[1])) end
if total >= 30 then wait = math.max(wait, redis.call('PTTL', KEYS[2])) end
if principal >= 5 or total >= 30 then return {0, math.max(1, wait)} end
for i = 1, 2 do
  if redis.call('INCR', KEYS[i]) == 1 then redis.call('PEXPIRE', KEYS[i], 60000) end
end
return {1, 0}
`;

export async function checkPreviewQuota(principal, signal, namespace = 'ecopin:preview:v1') {
  try {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !token || !/^[a-zA-Z0-9:_-]{1,100}$/.test(namespace)) {
      return { status: 503 };
    }
    const id = createHash('sha256').update(principal).digest('hex');
    const deadline = AbortSignal.any([AbortSignal.timeout(2000), ...(signal ? [signal] : [])]);
    const response = await fetch(url.href, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', admissionScript, 2, `${namespace}:{preview}:user:${id}`, `${namespace}:{preview}:global`]),
      cache: 'no-store', redirect: 'error', signal: deadline,
    });
    if (!response.ok) return { status: 503 };
    const { result } = await readBoundedJson(response.body, 4096, deadline);
    if (!Array.isArray(result) || result.length !== 2) return { status: 503 };
    if (result[0] === 1 && result[1] === 0) return { status: 200 };
    if (result[0] === 0 && Number.isInteger(result[1]) && result[1] > 0 && result[1] <= 60000) {
      return { status: 429, retryAfter: Math.ceil(result[1] / 1000) };
    }
  } catch {
    // A missing or unavailable shared limiter must never admit expensive work.
  }
  return { status: 503 };
}
