import test from 'node:test';
import assert from 'node:assert/strict';
import { handleResponse } from '../lib/api/optimization.js';

test('handleResponse: formats 429 rate limit with friendly message and retryAfter', async () => {
  const mockResponse = {
    ok: false,
    status: 429,
    headers: new Headers(),
    json: async () => ({
      error: 'Too many requests, please try again later.',
      retryAfter: '15 minutes'
    })
  };

  await assert.rejects(
    async () => {
      await handleResponse(mockResponse, 'Failed to load planning job');
    },
    (err) => {
      assert.equal(err.status, 429);
      assert.equal(err.retryAfter, '15 minutes');
      assert.equal(err.isRateLimited, true);
      assert.match(err.message, /Too many requests: The system is temporarily busy/);
      assert.match(err.message, /15 minutes/);
      return true;
    }
  );
});

test('handleResponse: fallback to retry-after header when body retryAfter is missing', async () => {
  const headers = new Headers();
  headers.set('retry-after', '60 seconds');

  const mockResponse = {
    ok: false,
    status: 429,
    headers,
    json: async () => ({
      error: 'Too many requests'
    })
  };

  await assert.rejects(
    async () => {
      await handleResponse(mockResponse, 'Failed to load planning job');
    },
    (err) => {
      assert.equal(err.status, 429);
      assert.equal(err.retryAfter, '60 seconds');
      assert.match(err.message, /60 seconds/);
      return true;
    }
  );
});

test('handleResponse: prioritizes errorData.error over generic errorContext for 4xx/5xx', async () => {
  const mockResponse = {
    ok: false,
    status: 400,
    headers: new Headers(),
    json: async () => ({
      error: 'Invalid planning parameters provided'
    })
  };

  await assert.rejects(
    async () => {
      await handleResponse(mockResponse, 'Failed to load dispatch plan');
    },
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.message, 'Invalid planning parameters provided');
      return true;
    }
  );
});

test('handleResponse: returns parsed JSON on 200 OK', async () => {
  const mockResponse = {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ id: 'job-123', status: 'completed' })
  };

  const data = await handleResponse(mockResponse, 'Failed to load planning job');
  assert.deepEqual(data, { id: 'job-123', status: 'completed' });
});
