import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAllowedBackendRequest, isPublicBackendRequest } from '../lib/server/backend-policy.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('WT-89: Backend policy allows public and authenticated account deletion endpoints', () => {
  // DELETE /api/auth/delete-account and /api/auth/account
  assert.equal(isAllowedBackendRequest('DELETE', '/api/auth/delete-account'), true)
  assert.equal(isAllowedBackendRequest('DELETE', '/api/auth/account'), true)
  assert.equal(isAllowedBackendRequest('POST', '/api/auth/delete-account'), true)

  // Public accessibility for unauthenticated web deletion portal
  assert.equal(isPublicBackendRequest('POST', '/api/auth/delete-account'), true)
  assert.equal(isPublicBackendRequest('DELETE', '/api/auth/delete-account'), true)
})

test('WT-89: LandingPage footer navigation exposes public Delete Account link', () => {
  // The landing page renders the shared public footer, which owns the navigation links.
  const landing = fs.readFileSync(path.resolve(__dirname, '../components/landing/LandingPage.js'), 'utf8')
  const footer = fs.readFileSync(path.resolve(__dirname, '../components/landing/PublicFooter.js'), 'utf8')
  assert.match(landing, /PublicFooter/, 'LandingPage must render the public footer')
  assert.ok(footer.includes('href="/delete-account"'), 'Public footer must include link to /delete-account')
  assert.ok(footer.includes('Delete account'), 'Public footer must display Delete account text')
})

test('WT-89: DeleteAccountPage discloses credential scrubbing and public statistics anonymization', () => {
  const pagePath = path.resolve(__dirname, '../app/delete-account/page.js')
  const content = fs.readFileSync(pagePath, 'utf8')

  // Disclosures required by Google Play User Data policy
  assert.ok(content.includes('What is permanently erased'), 'Page must explain what data is deleted')
  assert.ok(content.includes('What is retained anonymously'), 'Page must explain what statistics are retained anonymously')
  assert.ok(content.includes('/api/backend/api/auth/delete-account'), 'Form must target backend delete-account API')
  assert.ok(content.includes('delete-email'), 'Form must provide email field')
  assert.ok(content.includes('delete-password'), 'Form must provide password field')
  assert.ok(content.includes('checkbox'), 'Form must require confirmation checkbox')
})
