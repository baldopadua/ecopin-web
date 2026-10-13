import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test('anonymous client can select from public_reports view', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('public_reports').select('*').limit(5);
  assert.equal(error, null);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);

  const sample = data[0];
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

test('anonymous client is denied access to reports_view per security policy', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('reports_view').select('*').limit(1);
  assert.ok(error);
  assert.equal(error.code, '42501');
});

test('issue types can be fetched anonymously from public_reports', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('public_reports').select('issue_type').not('issue_type', 'is', null);
  assert.equal(error, null);
  assert.ok(Array.isArray(data));
  const unique = [...new Set(data.map(i => i.issue_type))];
  assert.ok(unique.length > 0);
});
