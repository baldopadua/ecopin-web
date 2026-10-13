import test from 'node:test'
import assert from 'node:assert/strict'
import { exploreUrl } from '../lib/explore-url.mjs'

test('map and gallery are modes of the same explore route', () => {
  assert.equal(exploreUrl('map'), '/explore')
  assert.equal(exploreUrl('gallery'), '/explore?view=gallery')
})

test('changing mode preserves report and filter links', () => {
  const query = new URLSearchParams('report=report%20one&issue=waste&view=gallery')
  assert.equal(exploreUrl('map', query), '/explore?report=report+one&issue=waste')
  assert.equal(query.get('view'), 'gallery')
})

test('legacy redirects preserve repeated query values and use a safe mode', () => {
  assert.equal(exploreUrl('gallery', { report: 'a/b', tag: ['one', 'two'] }), '/explore?report=a%2Fb&tag=one&tag=two&view=gallery')
  assert.equal(exploreUrl('unknown', { view: 'unknown' }), '/explore')
})
