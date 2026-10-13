import test from 'node:test'
import assert from 'node:assert/strict'
import { publicReportSearchText, matchesGallerySearch } from '../lib/public-gallery.mjs'

test('gallery search matches words across public title, description and category', () => {
  const text = publicReportSearchText({ title: 'Rosario street', description: 'Waste beside the road', issue_type: 'illegal_logging' })
  assert.equal(matchesGallerySearch(text, '  WASTE   rosario '), true)
  assert.equal(matchesGallerySearch(text, 'illegal logging'), true)
  assert.equal(matchesGallerySearch(text, 'flooding'), false)
})

test('gallery search accepts accents and empty queries without indexing private fields', () => {
  const text = publicReportSearchText({ title: 'San José', user_id: 'private-user', notes: 'private location' })
  assert.equal(matchesGallerySearch(text, 'jose'), true)
  assert.equal(matchesGallerySearch(text, ''), true)
  assert.equal(matchesGallerySearch(text, 'private'), false)
})
