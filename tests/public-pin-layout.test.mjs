import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutPublicPins } from '../components/landing/public-pin-layout.mjs'

const reports = [
  { id: 'b', latitude: 14.58, longitude: 121.085, cluster_id: 'same' },
  { id: 'a', latitude: 14.58, longitude: 121.085, cluster_id: 'same' },
  { id: 'c', latitude: 14.6, longitude: 121.1 },
]

test('overview groups matching report clusters and preserves unrelated pins', () => {
  const pins = layoutPublicPins(reports, 14)
  assert.equal(pins.length, 2)
  assert.equal(pins[0].isCluster, true)
  assert.equal(pins[0].report.id, 'a')
  assert.deepEqual(pins[0].position, [14.58, 121.085])
  assert.equal(pins[1].report.id, 'c')
})

test('zoomed-in reports separate with the same radius rule as the full map', () => {
  const pins = layoutPublicPins(reports, 15)
  assert.equal(pins.length, 3)
  assert.equal(pins[0].separated, true)
  assert.notDeepEqual(pins[0].position, pins[1].position)
  assert.ok(Math.abs(pins[0].position[1] - 121.085 - .0007) < 1e-10)
  assert.deepEqual(pins[2].position, [14.6, 121.1])
})

test('query reordering does not shuffle pin positions or mutate source rows', () => {
  assert.deepEqual(layoutPublicPins(reports, 16), layoutPublicPins([...reports].reverse(), 16).sort((a, b) => String(a.key).localeCompare(String(b.key))))
  assert.equal(reports[0].id, 'b')
  assert.deepEqual(reports[0], { id: 'b', latitude: 14.58, longitude: 121.085, cluster_id: 'same' })
})

test('coincident unclustered reports are grouped and invalid locations are excluded', () => {
  const pins = layoutPublicPins([{ id: 'a', latitude: 14.58, longitude: 121.085 }, { id: 'b', latitude: 14.58, longitude: 121.085 }, { id: 'invalid', latitude: null, longitude: null }], 14)
  assert.equal(pins.length, 1)
  assert.equal(pins[0].members.length, 2)
})
