import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ticketQueueQuery, ticketCategoryLabel, ticketStatusLabel, ticketReplyStatuses, ticketQueueFilters } from '../lib/support-tickets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;

// The normal command must discover tests by pattern. A hand-maintained file list let 15 missing files pass silently
// (node --test skips paths that do not exist) and left the executive and later feature suites out of the release gate.
test('the normal test command discovers unit tests by pattern and is the one release checks run', () => {
  assert.match(scripts['test:unit'], /node --test .*tests\/\*\*\/\*\.test\.mjs/);
  assert.doesNotMatch(scripts['test:unit'], /tests\/[\w-]+\.test\.mjs(?!\\?")/, 'no hand-maintained file list');
  assert.equal(scripts.test, 'npm run test:unit');
});

test('feature suites that the release gate depends on exist (a deleted or renamed suite fails here)', () => {
  const required = ['barangay-executive', 'operational-events', 'live-operations', 'field-crew-operations', 'incident-case-record', 'cleanup-proof-photos',
    'proxy-failure-diagnostics', 'web-session-routes', 'session-credentials', 'web-session-store', 'dashboard-query-client', 'response-deadline'];
  for (const name of required) assert.ok(fs.existsSync(path.join(root, 'tests', `${name}.test.mjs`)), `Missing tests/${name}.test.mjs`);
});

test('browser harnesses stay out of the unit command and in the end-to-end command', () => {
  assert.equal(scripts['test:e2e'], 'node --test tests/*.browser.cjs');
  const browserOnly = fs.readdirSync(path.join(root, 'tests')).filter(f => /\.test\.cjs$/.test(f));
  for (const file of browserOnly) assert.match(fs.readFileSync(path.join(root, 'tests', file), 'utf8'), /playwright/, `${file} is not a browser test; give it the .mjs unit name`);
});

test('support ticket helpers: paging query, labels and reply statuses match the backend contract', () => {
  assert.equal(ticketQueueQuery({ status: 'open' }), 'limit=20&status=open');
  const cursor = { created_at: '2026-11-03T00:00:00.000Z', id: '11111111-1111-4111-8111-111111111111' };
  const params = new URLSearchParams(ticketQueueQuery({ status: 'resolved', cursor, limit: 5 }));
  assert.equal(params.get('limit'), '5'); assert.equal(params.get('status'), 'resolved');
  assert.equal(params.get('before_created'), cursor.created_at); assert.equal(params.get('before_id'), cursor.id);
  assert.equal(new URLSearchParams(ticketQueueQuery({ status: null })).has('status'), false);
  assert.deepEqual(ticketReplyStatuses, ['in_progress', 'resolved', 'closed']);
  assert.deepEqual(ticketQueueFilters, ['open', 'in_progress', 'resolved', 'closed']);
  assert.equal(ticketCategoryLabel('location_mismatch'), 'Location correction'); assert.equal(ticketCategoryLabel('unknown'), 'Other');
  assert.equal(ticketStatusLabel('in_progress'), 'In progress'); assert.equal(ticketStatusLabel('nope'), 'Open');
});
