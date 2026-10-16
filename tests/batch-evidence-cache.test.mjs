import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evidenceCache,
  getCachedEvidence,
  setCachedEvidence,
  hasCachedEvidence,
  fetchBatchReportEvidence
} from '../lib/api/reports.js'

test('evidence cache normalizes number and string keys', () => {
  evidenceCache.clear()

  setCachedEvidence(101, [{ name: 'photo1.jpg', url: 'https://cloudinary.com/p1.jpg' }])
  
  // Can retrieve with number or string ID
  assert.equal(hasCachedEvidence(101), true)
  assert.equal(hasCachedEvidence('101'), true)
  
  const fromNum = getCachedEvidence(101)
  const fromStr = getCachedEvidence('101')
  assert.equal(fromNum.length, 1)
  assert.equal(fromStr.length, 1)
  assert.equal(fromNum[0].url, 'https://cloudinary.com/p1.jpg')
})

test('fetchBatchReportEvidence serves completely from cache when items are cached', async () => {
  evidenceCache.clear()

  setCachedEvidence('report-a', [{ url: 'https://example.com/a.jpg' }])
  setCachedEvidence('report-b', [{ url: 'https://example.com/b.jpg' }])

  // Calling batch fetch for report-a and report-b should return cached data without any network call
  const results = await fetchBatchReportEvidence(['report-a', 'report-b'])
  assert.deepEqual(results, {
    'report-a': [{ url: 'https://example.com/a.jpg' }],
    'report-b': [{ url: 'https://example.com/b.jpg' }]
  })
})
