import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { fetchPublicReportPage, fetchPublicReportById } from '../lib/api/public-report-page.mjs';

const bounds = { south: 14.5, north: 14.7, west: 121, east: 121.2 };

test('report links read one reviewed row from the public projection', async () => {
  await withApi(async (db, requests) => {
    assert.equal((await fetchPublicReportById(db, 'a')).id, 'a');
    assert.equal(requests[0].pathname, '/rest/v1/public_reports');
    assert.equal(requests[0].searchParams.get('id'), 'eq.a');
    assert.equal(requests[0].searchParams.get('limit'), '1');
    assert.equal(requests[0].searchParams.get('select').includes('user_id'), false);
  }, [{ id: 'a', validation_status: 'approved' }]);
});

test('report links cannot reveal an unreviewed or missing report', async () => {
  await withApi(async db => assert.equal(await fetchPublicReportById(db, 'a'), null), [{ id: 'a', validation_status: 'pending' }]);
  await withApi(async db => assert.equal(await fetchPublicReportById(db, 'missing'), null), []);
});

test('aborted report links never issue a query', async () => {
  await withApi(async (db, requests) => {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(fetchPublicReportById(db, 'a', controller.signal));
    assert.equal(requests.length, 0);
  });
});

async function withApi(run, response = [{id:'a'}, {id:'b'}, {id:'c'}], status = 200) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(new URL(req.url, 'http://localhost'));
    res.writeHead(status, {'Content-Type':'application/json'});
    res.end(JSON.stringify(response));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const db = createClient(`http://127.0.0.1:${server.address().port}`, 'synthetic-key', {auth:{persistSession:false,autoRefreshToken:false}});
  try { await run(db, requests); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('map request uses the safe projection, viewport and deterministic bounded page', async () => {
  await withApi(async (db, requests) => {
    const result = await fetchPublicReportPage(db, {bounds, limit:2, status:'unresolved', issueType:'waste'});
    assert.deepEqual(result, {reports:[{id:'a'},{id:'b'}],hasMore:true});
    assert.equal(requests.length,1);
    const url = requests[0];
    assert.equal(url.pathname,'/rest/v1/public_reports');
    const fields = url.searchParams.get('select').split(',');
    assert.equal(fields.includes('*'),false);
    for (const privateField of ['notes','user_id','before_photo_url','idempotency_key','ml_probabilities']) assert.equal(fields.includes(privateField),false);
    assert.equal(url.searchParams.get('limit'),'3');
    assert.equal(url.searchParams.get('order'),'created_at.desc,id.desc');
    assert.equal(url.searchParams.get('latitude'),'gte.14.5');
    assert.deepEqual(url.searchParams.getAll('latitude'),['gte.14.5','lte.14.7']);
    assert.deepEqual(url.searchParams.getAll('longitude'),['gte.121','lte.121.2']);
    assert.equal(url.searchParams.get('status'),'eq.unresolved');
    assert.equal(url.searchParams.get('issue_type'),'eq.waste');
  });
});
test('short page is complete, not silently marked truncated', async () => {
  await withApi(async db => assert.deepEqual(await fetchPublicReportPage(db,{bounds,limit:2}),{reports:[{id:'a'}],hasMore:false}),[{id:'a'}]);
});
test('dateline viewport covers both sides of the date line', async () => {
  await withApi(async (db, requests) => {
    await fetchPublicReportPage(db,{bounds:{...bounds,west:170,east:190}});
    assert.equal(requests[0].searchParams.get('or'),'(longitude.gte.170,longitude.lte.-170)');
  });
});
test('a full-world viewport does not accidentally exclude wrapped longitudes', async () => {
  await withApi(async (db, requests) => {
    await fetchPublicReportPage(db,{bounds:{...bounds,west:-200,east:200}});
    assert.equal(requests[0].searchParams.has('longitude'),false);
    assert.equal(requests[0].searchParams.has('or'),false);
  });
});
test('invalid bounds and page sizes fail before sending a request', async () => {
  await withApi(async (db, requests) => {
    for (const options of [{},{bounds:{...bounds,south:NaN}},{bounds:{...bounds,north:91}},{bounds:{...bounds,south:15,north:14}},{bounds,limit:0},{bounds,limit:501},{bounds,limit:1.5}]) {
      await assert.rejects(fetchPublicReportPage(db,options),RangeError);
    }
    assert.equal(requests.length,0);
  });
});
test('database errors remain visible to callers rather than becoming an empty map', async () => {
  await withApi(async db => {
    await assert.rejects(fetchPublicReportPage(db,{bounds}),error=>error.code==='42501');
  },{code:'42501',message:'permission denied'},401);
});
test('an aborted viewport request cannot produce a successful empty page', async () => {
  await withApi(async (db, requests) => {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(fetchPublicReportPage(db,{bounds,signal:controller.signal}));
    assert.equal(requests.length,0);
  });
});
