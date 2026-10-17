import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_REPORT_FIELDS } from '../lib/api/public-report-page.mjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test('anonymous client can select from public_reports view', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('public_reports').select('*').limit(1);
  assert.equal(error, null);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  const sample = data[0];
  assert.deepEqual(Object.keys(sample).sort(), PUBLIC_REPORT_FIELDS.split(',').sort());
  assert.ok('id' in sample);
  assert.ok('title' in sample);
  assert.ok('status' in sample);
  assert.ok('validation_status' in sample);
  assert.ok('latitude' in sample);
  assert.ok('longitude' in sample);

  // Verify private columns are excluded by public projection
  assert.equal('user_id' in sample, false);
  assert.equal('notes' in sample, false);
  assert.equal('before_photo_url' in sample, false);
  assert.equal('idempotency_key' in sample, false);
});

for (const fields of ['*', 'id', 'user_id', 'notes', 'before_photo_url']) {
  test(`anonymous legacy-view selection ${fields} is denied, including column grants`, async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.from('reports_view').select(fields).limit(1);
    assert.equal(error?.code, '42501', 'Expected database permission denial, not a network or missing-view error');
    assert.ok(data === null, 'Denied queries must not return rows');
  });
}

test('issue types can be fetched anonymously from public_reports', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('public_reports').select('issue_type').not('issue_type', 'is', null);
  assert.equal(error, null);
  assert.ok(Array.isArray(data));
  const unique = [...new Set(data.map(i => i.issue_type))];
  assert.ok(unique.length > 0);
});
