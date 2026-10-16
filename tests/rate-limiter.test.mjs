import test from 'node:test';
import assert from 'node:assert/strict';
import { globalRateLimiter, rateLimitedFetch } from '../lib/rateLimiter.js';

test('RateLimiter rejects immediately when already aborted', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await globalRateLimiter.acquire(controller.signal);
    },
    { name: 'AbortError' }
  );
});

test('RateLimiter dequeues and rejects when aborted while waiting', async () => {
  const controller = new AbortController();
  
  // Fill capacity temporarily
  const promises = [];
  for (let i = 0; i < 30; i++) {
    promises.push(globalRateLimiter.acquire());
  }
  await Promise.all(promises);

  // Next acquire will be queued
  const acquirePromise = globalRateLimiter.acquire(controller.signal);
  
  // Abort while queued
  controller.abort();

  await assert.rejects(
    acquirePromise,
    { name: 'AbortError' }
  );
});

test('rateLimitedFetch aborts before fetch call', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await rateLimitedFetch('http://example.com/test', { signal: controller.signal });
    },
    { name: 'AbortError' }
  );
});
