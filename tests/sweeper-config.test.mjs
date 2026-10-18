import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = (await readFile(new URL('../lib/api/sweeper.js', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '')
  .replaceAll('export async function', 'async function') +
  '\n;({ updateSlaThreshold, updateShiftDuration, updateWorkTime })'

function loadApi(rateLimitedFetch) {
  return vm.runInNewContext(source, {
    localStorage: { getItem: () => 'test-token' },
    process: { env: { NEXT_PUBLIC_BACKEND_API_URL: 'https://api.test' } },
    rateLimitedFetch,
    readSessionKey() { return 'test-session'; },
    triggerSessionExpired() {},
    reportDiagnostic() {},
    console: { error() {} },
    URLSearchParams
  })
}

test('SLA threshold sends the explicit large-change confirmation flag', async () => {
  let request
  const api = loadApi(async (url, options) => {
    request = { url, options }
    return { ok: true, status: 200, json: async () => ({ success: true }) }
  })

  await api.updateSlaThreshold(72, true)

  assert.equal(request.url, 'https://api.test/api/sweeper/config/sla-threshold')
  assert.deepEqual(JSON.parse(request.options.body), { hours: 72, confirmLargeChange: true })
})

test('SLA threshold defaults confirmation to false and surfaces backend validation errors', async () => {
  let body
  const api = loadApi(async (_url, options) => {
    body = JSON.parse(options.body)
    return { ok: false, status: 400, json: async () => ({ message: 'Lifecycle threshold must be between 1 and 168 hours' }) }
  })

  await assert.rejects(api.updateSlaThreshold(20), (error) => {
    assert.deepEqual(body, { hours: 20, confirmLargeChange: false })
    assert.equal(error.message, 'Lifecycle threshold must be between 1 and 168 hours')
    return true
  })
})

test('work time surfaces backend validation errors', async () => {
  const api = loadApi(async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'Value is outside the allowed range' })
  }))

  await assert.rejects(api.updateWorkTime('cleanup', 30), /Value is outside the allowed range/)
})
