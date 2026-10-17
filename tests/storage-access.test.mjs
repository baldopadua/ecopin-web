import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

for (const bucket of ['Report Evidence', 'Cleanup Task Photos', 'Report Cleanup']) {
  test(`anonymous callers cannot list ${bucket}`, async () => {
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    // RLS should filter the list, not hide a network/configuration failure.
    assert.equal(error, null, 'The storage list request must complete successfully');
    assert.ok(Array.isArray(data) && data.length === 0, 'Anonymous listing must expose no entries');
  });
}
